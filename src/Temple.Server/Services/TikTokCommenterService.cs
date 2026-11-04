using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Temple.Server.Models;

namespace Temple.Server.Services;

public class TikTokCommenterService : ITikTokCommenterService, IDisposable
{
    private readonly ILogger<TikTokCommenterService> _logger;
    private readonly ITempleService _templeService;
    private readonly string _scriptPath;
    private Process? _process;
    private StreamWriter? _stdin;
    private readonly object _lock = new();

    private readonly TikTokCommenterState _state = new();
    private DateTime _lastCommentSentUtc = DateTime.MinValue;
    private TaskCompletionSource<bool>? _currentCommentTcs;

    public TikTokCommenterService(
        ILogger<TikTokCommenterService> logger,
        ITempleService templeService,
        IHostEnvironment env)
    {
        _logger = logger;
        _templeService = templeService;

        string scriptCandidate = Path.Combine(env.ContentRootPath, "scripts", "tiktok_commenter.js");
        _scriptPath = File.Exists(scriptCandidate)
            ? scriptCandidate
            : Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "scripts", "tiktok_commenter.js"));

        string dataDir = Directory.Exists(Path.Combine(env.ContentRootPath, "data"))
            ? Path.Combine(env.ContentRootPath, "data")
            : Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "data"));
        string cookiePath = Path.Combine(dataDir, "tiktok_browser_profile", "Default", "Network", "Cookies");
        string savedCookieJson = Path.Combine(dataDir, "tiktok_browser_profile", "saved_cookies.json");

        if ((File.Exists(cookiePath) && new FileInfo(cookiePath).Length > 1000) ||
            (File.Exists(savedCookieJson) && new FileInfo(savedCookieJson).Length > 10))
        {
            _state.LoggedIn = true;
            _state.StatusMessage = "Đã nhận diện phiên đăng nhập TikTok từ profile/cookie lưu trữ";
            _state.LastError = null;
        }

        try
        {
            EnsureProcessStarted();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[PlaywrightCommenter] Chưa thể khởi chạy nền");
        }
    }

    public TikTokCommenterState GetState()
    {
        lock (_lock)
        {
            return new TikTokCommenterState
            {
                Running = _state.Running,
                LoggedIn = _state.LoggedIn,
                Url = _state.Url,
                LastComment = _state.LastComment,
                LastCommentTime = _state.LastCommentTime,
                StatusMessage = _state.StatusMessage,
                LastError = _state.LastError
            };
        }
    }

    public async Task<TikTokCommenterState> StartAsync(string? username = null, bool headless = false)
    {
        string raw = (username ?? _templeService.GetPublicState().TikTok.Username ?? "tranyennhi0987").Trim();
        string liveUrl;
        string displayName;

        if (raw.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || raw.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            liveUrl = raw;
            displayName = raw;
        }
        else
        {
            string targetUser = raw.TrimStart('@');
            liveUrl = $"https://www.tiktok.com/@{targetUser}/live";
            displayName = $"@{targetUser}";
        }

        lock (_lock)
        {
            EnsureProcessStarted();
            _state.Running = true;
            _state.Url = liveUrl;
            _state.StatusMessage = $"Đang mở phòng Live {displayName}...";
            _state.LastError = null;
        }

        SendCommand(new { action = "open", url = liveUrl, headless });
        BroadcastState();

        await Task.Delay(1500);
        return GetState();
    }

    public async Task<TikTokCommenterState> StopAsync()
    {
        lock (_lock)
        {
            if (_process != null && !_process.HasExited)
            {
                SendCommand(new { action = "close" });
            }
            StopProcess();
            _state.Running = false;
            _state.StatusMessage = "Đã dừng trình duyệt Playwright";
        }

        BroadcastState();
        await Task.CompletedTask;
        return GetState();
    }

    public async Task<TikTokCommenterState> OpenLoginAsync()
    {
        lock (_lock)
        {
            EnsureProcessStarted();
            _state.Running = true;
            _state.Url = "https://www.tiktok.com/login";
            _state.StatusMessage = "Đang mở trang đăng nhập TikTok...";
            _state.LastError = null;
        }

        SendCommand(new { action = "open_login" });
        BroadcastState();

        await Task.Delay(1500);
        return GetState();
    }

    public async Task<TikTokCommenterState> SetCookieAsync(string cookie)
    {
        string clean = (cookie ?? "").Trim();
        if (string.IsNullOrWhiteSpace(clean))
        {
            lock (_lock)
            {
                _state.LastError = "Nội dung cookie trống.";
            }
            BroadcastState();
            return GetState();
        }

        lock (_lock)
        {
            EnsureProcessStarted();
            _state.Running = true;
            _state.StatusMessage = "Đang nạp Cookie TikTok...";
            _state.LastError = null;
        }

        SendCommand(new { action = "set_cookies", cookie = clean });
        BroadcastState();

        await Task.Delay(1200);
        return GetState();
    }

    public async Task<bool> OpenSystemBrowserLoginAsync()
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "https://www.tiktok.com/login",
                UseShellExecute = true
            };
            Process.Start(psi);
            return await Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[PlaywrightCommenter] Lỗi mở trình duyệt hệ thống");
            return false;
        }
    }

    public async Task<bool> SendCommentAsync(string text, bool ignoreCooldown = false)
    {
        string clean = (text ?? "").Trim();
        if (string.IsNullOrWhiteSpace(clean))
        {
            return false;
        }

        // Kiểm tra giãn cách thời gian (cooldown) nếu không phải gửi thủ công
        if (!ignoreCooldown)
        {
            int minIntervalSec = _templeService.GetPublicState().Settings.AutoCommentIntervalSeconds;
            if (minIntervalSec < 8) minIntervalSec = 8;

            var elapsed = DateTime.UtcNow - _lastCommentSentUtc;
            if (elapsed.TotalSeconds < minIntervalSec)
            {
                _logger.LogWarning("[PlaywrightCommenter] Bỏ qua bình luận do chưa hết thời gian chờ ({Elapsed:F1}s / {Min}s)", elapsed.TotalSeconds, minIntervalSec);
                return false;
            }
        }

        TaskCompletionSource<bool> tcs;
        lock (_lock)
        {
            if (_process == null || _process.HasExited)
            {
                _state.LastError = "Trình duyệt Playwright chưa được khởi chạy.";
                BroadcastState();
                return false;
            }

            _currentCommentTcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            tcs = _currentCommentTcs;
        }

        _logger.LogInformation("[PlaywrightCommenter] Đang gửi bình luận: {Comment}", clean);
        SendCommand(new { action = "comment", text = clean });

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(12));
        using (cts.Token.Register(() => tcs.TrySetResult(false)))
        {
            bool ok = await tcs.Task;
            if (ok)
            {
                _lastCommentSentUtc = DateTime.UtcNow;
            }
            return ok;
        }
    }

    public async Task<bool> SendRandomTimeGreetingAsync(string? username = null, bool ignoreCooldown = false)
    {
        string message = !string.IsNullOrWhiteSpace(username)
            ? LiveChatGenerator.GetMemberGreeting(username)
            : LiveChatGenerator.GetRandomChatMessage();

        return await SendCommentAsync(message, ignoreCooldown);
    }

    private void EnsureProcessStarted()
    {
        if (_process != null && !_process.HasExited) return;

        StopProcess();

        string scriptDir = Path.GetDirectoryName(_scriptPath) ?? string.Empty;
        string candidateNode1 = Path.Combine(scriptDir, "node.exe");
        string candidateNode2 = Path.Combine(scriptDir, "..", "node.exe");
        string nodeExe = File.Exists(candidateNode1) ? candidateNode1 : (File.Exists(candidateNode2) ? Path.GetFullPath(candidateNode2) : "node");

        var startInfo = new ProcessStartInfo
        {
            FileName = nodeExe,
            Arguments = $"\"{_scriptPath}\"",
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardInputEncoding = Encoding.UTF8,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
            UseShellExecute = false,
            CreateNoWindow = false,
            WorkingDirectory = scriptDir
        };
        startInfo.EnvironmentVariables["NODE_SKIP_PLATFORM_CHECK"] = "1";
        startInfo.EnvironmentVariables["NODE_PATH"] = Path.Combine(scriptDir, "node_modules");

        _process = new Process { StartInfo = startInfo, EnableRaisingEvents = true };

        _process.OutputDataReceived += (s, e) =>
        {
            if (!string.IsNullOrWhiteSpace(e.Data))
            {
                HandleStdoutLine(e.Data.Trim());
            }
        };

        _process.ErrorDataReceived += (s, e) =>
        {
            if (!string.IsNullOrWhiteSpace(e.Data))
            {
                _logger.LogDebug("[TikTokCommenter stderr] {Msg}", e.Data);
            }
        };

        _process.Exited += (s, e) =>
        {
            lock (_lock)
            {
                _state.Running = false;
                _state.StatusMessage = "Tiến trình Playwright đã kết thúc.";
            }
            BroadcastState();
        };

        _process.Start();
        _stdin = _process.StandardInput;
        _process.BeginOutputReadLine();
        _process.BeginErrorReadLine();
    }

    private void SendCommand(object command)
    {
        try
        {
            string json = JsonSerializer.Serialize(command);
            lock (_lock)
            {
                if (_stdin != null)
                {
                    _stdin.WriteLine(json);
                    _stdin.Flush();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[PlaywrightCommenter] Lỗi gửi lệnh stdin");
        }
    }

    private void HandleStdoutLine(string line)
    {
        try
        {
            using var doc = JsonDocument.Parse(line);
            var root = doc.RootElement;
            if (!root.TryGetProperty("type", out var typeProp)) return;

            string type = typeProp.GetString() ?? string.Empty;

            switch (type)
            {
                case "ready":
                    _logger.LogInformation("[PlaywrightCommenter] Script Node sẵn sàng");
                    if (root.TryGetProperty("loggedIn", out var rLoggedIn))
                    {
                        lock (_lock)
                        {
                            _state.LoggedIn = rLoggedIn.GetBoolean();
                            if (_state.LoggedIn)
                            {
                                _state.LastError = null;
                            }
                        }
                        BroadcastState();
                    }
                    break;

                case "status":
                    lock (_lock)
                    {
                        if (root.TryGetProperty("running", out var rp)) _state.Running = rp.GetBoolean();
                        if (root.TryGetProperty("loggedIn", out var lp))
                        {
                            _state.LoggedIn = lp.GetBoolean();
                            if (_state.LoggedIn)
                            {
                                _state.LastError = null;
                            }
                        }
                        if (root.TryGetProperty("url", out var up)) _state.Url = up.GetString();
                        if (root.TryGetProperty("message", out var mp)) _state.StatusMessage = mp.GetString() ?? _state.StatusMessage;
                    }
                    BroadcastState();
                    break;

                case "comment_result":
                    bool success = root.TryGetProperty("success", out var sp) && sp.GetBoolean();
                    string text = root.TryGetProperty("text", out var tp) ? tp.GetString() ?? "" : "";
                    string? err = root.TryGetProperty("error", out var ep) ? ep.GetString() : null;

                    lock (_lock)
                    {
                        if (success)
                        {
                            _state.LastComment = text;
                            _state.LastCommentTime = DateTime.Now.ToString("HH:mm:ss");
                            _state.StatusMessage = $"Đã gửi bình luận: {text}";
                            _state.LastError = null;
                            _logger.LogInformation("[PlaywrightCommenter] Đã gửi bình luận thành công: {Text}", text);
                        }
                        else
                        {
                            _state.LastError = err ?? "Không thể gửi bình luận";
                            _state.StatusMessage = _state.LastError;
                            _logger.LogWarning("[PlaywrightCommenter] Gửi bình luận thất bại: {Error}", err);
                        }
                    }

                    _currentCommentTcs?.TrySetResult(success);
                    BroadcastState();
                    break;

                case "error":
                    string errorMsg = root.TryGetProperty("message", out var errP) ? errP.GetString() ?? "Lỗi" : "Lỗi";
                    lock (_lock)
                    {
                        _state.LastError = errorMsg;
                        _state.StatusMessage = errorMsg;
                    }
                    _logger.LogWarning("[PlaywrightCommenter Error] {Msg}", errorMsg);
                    _currentCommentTcs?.TrySetResult(false);
                    BroadcastState();
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[PlaywrightCommenter] Không thể parse stdout: {Line}", line);
        }
    }

    private void BroadcastState()
    {
        var cur = GetState();
        _templeService.Broadcast("tiktok.commenterState", cur);
    }

    private void StopProcess()
    {
        try
        {
            if (_process != null && !_process.HasExited)
            {
                _process.Kill(true);
            }
        }
        catch { }
        finally
        {
            _process = null;
            _stdin = null;
        }
    }

    public void Dispose()
    {
        StopProcess();
    }
}
