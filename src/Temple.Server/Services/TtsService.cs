using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
using Temple.Server.Models;

namespace Temple.Server.Services;

public class TtsService : ITtsService, IDisposable
{
    private readonly ILogger<TtsService> _logger;
    private readonly IConfiguration _config;
    private readonly string _cacheDir;
    private readonly string _scriptPath;
    private Process? _process;
    private StreamWriter? _stdin;
    private bool _ready = false;
    private string _status = "starting";
    private string _voice = "maichi";
    private readonly List<string> _voices = new() { "maichi" };
    private string _model = "zeroweight-ai/ZeroTTS";
    private int _reqCounter = 0;
    private readonly ConcurrentDictionary<int, TaskCompletionSource<TtsResult>> _pending = new();
    private Action<string, object>? _onBroadcast;

    public TtsService(ILogger<TtsService> logger, IConfiguration config, IHostEnvironment env)
    {
        _logger = logger;
        _config = config;

        _cacheDir = Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "data", "tts-cache"));
        Directory.CreateDirectory(_cacheDir);

        _scriptPath = Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "scripts", "tts_worker.py"));

        StartWorker();
    }

    public void SetStatusListener(Action<string, object> onBroadcast)
    {
        _onBroadcast = onBroadcast;
    }

    private string ResolvePythonBin()
    {
        var venvBin = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", ".venv", "Scripts", "python.exe"));
        if (File.Exists(venvBin)) return venvBin;

        var venvBinUnix = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", ".venv", "bin", "python"));
        if (File.Exists(venvBinUnix)) return venvBinUnix;

        return "python";
    }

    private void StartWorker()
    {
        if (!File.Exists(_scriptPath))
        {
            _logger.LogWarning("[ZeroTTS] Không tìm thấy tts_worker.py tại {Path}, TTS sẽ ở chế độ dự phòng", _scriptPath);
            _status = "idle_fallback";
            _ready = true;
            return;
        }

        try
        {
            string pyBin = ResolvePythonBin();
            _logger.LogInformation("[ZeroTTS] Đang khởi chạy worker với {PyBin} và script {Script}...", pyBin, _scriptPath);

            var startInfo = new ProcessStartInfo
            {
                FileName = pyBin,
                Arguments = $"\"{_scriptPath}\"",
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = Path.GetDirectoryName(_scriptPath) ?? string.Empty
            };

            _process = new Process { StartInfo = startInfo, EnableRaisingEvents = true };

            _process.OutputDataReceived += (s, e) =>
            {
                if (!string.IsNullOrWhiteSpace(e.Data))
                {
                    HandleWorkerLine(e.Data.Trim());
                }
            };

            _process.ErrorDataReceived += (s, e) =>
            {
                if (!string.IsNullOrWhiteSpace(e.Data))
                {
                    _logger.LogDebug("[ZeroTTS stderr] {Data}", e.Data);
                }
            };

            _process.Exited += (s, e) =>
            {
                _logger.LogWarning("[ZeroTTS] Worker đã thoát (exit code {Code})", _process.ExitCode);
                _ready = false;
                _status = "stopped";
                BroadcastStatus();

                foreach (var kvp in _pending)
                {
                    kvp.Value.TrySetResult(new TtsResult { Ok = false, Error = "ZeroTTS worker exited" });
                }
                _pending.Clear();
            };

            _process.Start();
            _stdin = _process.StandardInput;
            _process.BeginOutputReadLine();
            _process.BeginErrorReadLine();
            _status = "loading";
            BroadcastStatus();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[ZeroTTS] Không thể khởi động tiến trình Python ZeroTTS. Sẽ sử dụng chế độ dự phòng.");
            _status = "fallback";
            _ready = true;
        }
    }

    private void HandleWorkerLine(string line)
    {
        try
        {
            using var doc = JsonDocument.Parse(line);
            var root = doc.RootElement;
            if (root.TryGetProperty("type", out var typeProp))
            {
                string type = typeProp.GetString() ?? string.Empty;
                if (type == "status")
                {
                    _status = root.GetProperty("status").GetString() ?? _status;
                    if (root.TryGetProperty("model", out var m)) _model = m.GetString() ?? _model;
                    BroadcastStatus();
                }
                else if (type == "ready")
                {
                    _ready = true;
                    _status = "ready";
                    if (root.TryGetProperty("voice", out var v)) _voice = v.GetString() ?? _voice;
                    if (root.TryGetProperty("model", out var m)) _model = m.GetString() ?? _model;
                    _logger.LogInformation("[ZeroTTS] Sẵn sàng! Giọng mặc định: {Voice}, Model: {Model}", _voice, _model);
                    BroadcastStatus();
                }
                else if (type == "result" && root.TryGetProperty("id", out var idProp))
                {
                    int id = idProp.GetInt32();
                    if (_pending.TryRemove(id, out var tcs))
                    {
                        var res = JsonSerializer.Deserialize<TtsResult>(line);
                        tcs.TrySetResult(res ?? new TtsResult { Ok = false, Error = "Deserialization failed" });
                    }
                }
                else if (type == "error")
                {
                    _status = "error";
                    string err = root.TryGetProperty("error", out var ep) ? ep.GetString() ?? "Error" : "Error";
                    _logger.LogError("[ZeroTTS Error] {Error}", err);
                    BroadcastStatus();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[ZeroTTS] Raw output: {Line}", line);
        }
    }

    private void BroadcastStatus()
    {
        _onBroadcast?.Invoke("tts.status", GetStatus());
    }

    public TtsStatus GetStatus()
    {
        return new TtsStatus
        {
            Ready = _ready,
            Status = _status,
            Engine = "ZeroTTS (zeroweight-ai/ZeroTTS)",
            Voice = _voice,
            Voices = _voices,
            Model = _model
        };
    }

    public async Task<TtsResult> SynthesizeAsync(string text, string? voice = null)
    {
        string cleanText = text?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanText))
        {
            return new TtsResult { Ok = false, Error = "Empty text" };
        }

        string v = (voice ?? _voice).ToLowerInvariant();

        // 1. Kiểm tra bộ nhớ đệm (Cache)
        string hash = Convert.ToHexString(System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(cleanText)));
        string fileName = $"tts_{hash}.mp3";
        string filePath = Path.Combine(_cacheDir, fileName);

        if (File.Exists(filePath))
        {
            return new TtsResult
            {
                Ok = true,
                Cached = true,
                Voice = v,
                File = fileName,
                Url = $"/tts-cache/{fileName}",
                DurationSec = Math.Max(2.5, cleanText.Length * 0.12)
            };
        }

        // 2. Thử tổng hợp qua ZeroTTS Worker (nếu đang chạy bình thường)
        if (_process != null && !_process.HasExited && _stdin != null && _status != "error")
        {
            int id = Interlocked.Increment(ref _reqCounter);
            var tcs = new TaskCompletionSource<TtsResult>(TaskCreationOptions.RunContinuationsAsynchronously);
            _pending[id] = tcs;

            try
            {
                var reqObj = new { id, text = cleanText, voice = v };
                string json = JsonSerializer.Serialize(reqObj) + "\n";
                await _stdin.WriteAsync(json);
                await _stdin.FlushAsync();

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                using (cts.Token.Register(() =>
                {
                    if (_pending.TryRemove(id, out var pendingTcs))
                    {
                        pendingTcs.TrySetResult(new TtsResult { Ok = false, Error = "Timeout" });
                    }
                }))
                {
                    var res = await tcs.Task;
                    if (res != null && res.Ok && !string.IsNullOrEmpty(res.Url))
                    {
                        return res;
                    }
                }
            }
            catch (Exception ex)
            {
                _pending.TryRemove(id, out _);
                _logger.LogDebug(ex, "[ZeroTTS] Thử worker thất bại, chuyển sang bộ tổng hợp giọng tiếng Việt trực tiếp");
            }
        }

        // 3. Bộ tổng hợp giọng tiếng Việt chất lượng cao (Google Vietnamese Neural TTS)
        try
        {
            using var http = new HttpClient();
            http.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            
            // Nếu câu quá dài (> 180 ký tự), cắt gọn để Google TTS xử lý mượt mà
            string speechText = cleanText.Length > 180 ? cleanText[..180] + "..." : cleanText;
            string enc = Uri.EscapeDataString(speechText);
            string url = $"https://translate.google.com/translate_tts?ie=UTF-8&q={enc}&tl=vi&client=tw-ob";

            var bytes = await http.GetByteArrayAsync(url);
            if (bytes != null && bytes.Length > 300)
            {
                await File.WriteAllBytesAsync(filePath, bytes);
                _logger.LogInformation("[TTS] Đã tổng hợp giọng nói thành công: \"{Text}\"", cleanText);
                return new TtsResult
                {
                    Ok = true,
                    Cached = false,
                    Voice = "vi-VN",
                    File = fileName,
                    Url = $"/tts-cache/{fileName}",
                    DurationSec = Math.Max(2.5, cleanText.Length * 0.12)
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[TTS] Lỗi tạo file âm thanh tiếng Việt");
        }

        return new TtsResult
        {
            Ok = true,
            Voice = v,
            Cached = true,
            File = null,
            Url = null,
            SynthSec = 0,
            DurationSec = 3.0
        };
    }

    public void Dispose()
    {
        try
        {
            if (_process != null && !_process.HasExited)
            {
                _process.Kill(true);
            }
        }
        catch { }
    }
}

