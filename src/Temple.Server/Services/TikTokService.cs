using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Temple.Server.Models;

namespace Temple.Server.Services;

public class TikTokService : ITikTokService, IDisposable
{
    private readonly ILogger<TikTokService> _logger;
    private readonly ITempleService _templeService;
    private readonly string _scriptPath;
    private Process? _process;
    private StreamWriter? _stdin;
    private TaskCompletionSource<TikTokState>? _connectTcs;
    private readonly object _lock = new();

    private static readonly string[] AuspiciousWishes =
    {
        "Cầu cho gia đạo bình an, phúc lộc dồi dào, vạn sự cát tường",
        "Cầu sức khỏe dồi dào, tâm an trí sáng, gia đình êm ấm",
        "Cầu công danh sự nghiệp thuận buồm xuôi gió, hanh thông tấn tới",
        "Cầu tài lộc hanh thông, tai qua nạn khỏi, sở nguyện tòng tâm",
        "Cầu chư Phật gia hộ cho thí chủ thân tâm an lạc, vạn điều may mắn",
        "Cầu bách bệnh tiêu trừ, phước thọ tăng long, vạn sự như ý"
    };

    public TikTokService(ILogger<TikTokService> logger, ITempleService templeService, IHostEnvironment env)
    {
        _logger = logger;
        _templeService = templeService;
        string scriptCandidate = Path.Combine(env.ContentRootPath, "scripts", "tiktok_bridge.js");
        _scriptPath = File.Exists(scriptCandidate)
            ? scriptCandidate
            : Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "scripts", "tiktok_bridge.js"));
    }

    public async Task<TikTokState> ConnectAsync(string usernameOrUrl)
    {
        string raw = (usernameOrUrl ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new ArgumentException("Vui lòng nhập @username hoặc link TikTok Live hợp lệ.");
        }

        string cleanUser = raw.TrimStart('@').Split('/', '?', '#')[0];
        TaskCompletionSource<TikTokState> tcs;

        lock (_lock)
        {
            StopProcess();
            _connectTcs = new TaskCompletionSource<TikTokState>(TaskCreationOptions.RunContinuationsAsynchronously);
            tcs = _connectTcs;

            _templeService.UpdateTikTokState(tt =>
            {
                tt.Connecting = true;
                tt.Connected = false;
                tt.Username = cleanUser;
                tt.LastError = null;
            });

            try
            {
                string scriptDir = Path.GetDirectoryName(_scriptPath) ?? string.Empty;
                string candidateNode1 = Path.Combine(scriptDir, "node.exe");
                string candidateNode2 = Path.Combine(scriptDir, "..", "node.exe");
                string nodeExe = File.Exists(candidateNode1) ? candidateNode1 : (File.Exists(candidateNode2) ? Path.GetFullPath(candidateNode2) : "node");

                var startInfo = new ProcessStartInfo
                {
                    FileName = nodeExe,
                    Arguments = $"\"{_scriptPath}\" \"{cleanUser}\"",
                    RedirectStandardInput = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardInputEncoding = Encoding.UTF8,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WorkingDirectory = scriptDir
                };
                startInfo.EnvironmentVariables["NODE_SKIP_PLATFORM_CHECK"] = "1";

                _process = new Process { StartInfo = startInfo, EnableRaisingEvents = true };

                _process.OutputDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrWhiteSpace(e.Data))
                    {
                        HandleBridgeLine(e.Data.Trim());
                    }
                };

                _process.ErrorDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrWhiteSpace(e.Data))
                    {
                        _logger.LogDebug("[TikTokBridge stderr] {Msg}", e.Data);
                    }
                };

                _process.Exited += (s, e) =>
                {
                    _templeService.UpdateTikTokState(tt =>
                    {
                        tt.Connected = false;
                        tt.Connecting = false;
                    });
                    tcs.TrySetResult(_templeService.GetPublicState().TikTok);
                };

                _process.Start();
                _stdin = _process.StandardInput;
                _process.BeginOutputReadLine();
                _process.BeginErrorReadLine();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[TikTokLive] Không thể khởi chạy node tiktok_bridge.js");
                _process = null;
                _stdin = null;
                _templeService.UpdateTikTokState(tt =>
                {
                    tt.Connected = false;
                    tt.Connecting = false;
                    tt.LastError = "Node.js chưa được cấu hình hoặc tiktok-live-connector chưa được cài đặt trong thư mục scripts. Bạn có thể sử dụng chế độ Giả lập (Auto-Sim) hoặc gọi RPC trực tiếp từ TikFinity.";
                });
                tcs.TrySetResult(_templeService.GetPublicState().TikTok);
            }
        }

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(4));
        using (cts.Token.Register(() => tcs.TrySetResult(_templeService.GetPublicState().TikTok)))
        {
            return await tcs.Task;
        }
    }

    private void HandleBridgeLine(string line)
    {
        try
        {
            using var doc = JsonDocument.Parse(line);
            var root = doc.RootElement;
            if (!root.TryGetProperty("type", out var typeProp)) return;

            string type = typeProp.GetString() ?? string.Empty;

            switch (type)
            {
                case "connected":
                    string? roomId = root.TryGetProperty("roomId", out var r) ? r.GetString() : null;
                    _templeService.UpdateTikTokState(tt =>
                    {
                        tt.Connected = true;
                        tt.Connecting = false;
                        tt.RoomId = roomId;
                        tt.LastError = null;
                    });
                    _logger.LogInformation("[TikTokLive] Đã kết nối phòng Live! RoomId: {RoomId}", roomId);
                    _connectTcs?.TrySetResult(_templeService.GetPublicState().TikTok);
                    break;

                case "disconnected":
                    _templeService.UpdateTikTokState(tt =>
                    {
                        tt.Connected = false;
                        tt.Connecting = false;
                    });
                    _logger.LogInformation("[TikTokLive] Đã ngắt kết nối phòng Live");
                    break;

                case "error":
                    string errMsg = root.TryGetProperty("message", out var m) ? m.GetString() ?? "Lỗi kết nối" : "Lỗi kết nối";
                    _templeService.UpdateTikTokState(tt =>
                    {
                        tt.Connected = false;
                        tt.Connecting = false;
                        tt.LastError = errMsg;
                    });
                    _logger.LogWarning("[TikTokLive Error] {Error}", errMsg);
                    _connectTcs?.TrySetResult(_templeService.GetPublicState().TikTok);
                    break;

                case "room_user":
                    int viewerCount = root.TryGetProperty("viewerCount", out var vc) ? vc.GetInt32() : 0;
                    _templeService.UpdateTikTokState(tt => tt.ViewerCount = viewerCount);
                    _templeService.Broadcast("temple.viewerCount", new { viewerCount });
                    break;

                case "member":
                    string mUser = root.TryGetProperty("user", out var mu) ? mu.GetString() ?? "" : "";
                    string mUnique = root.TryGetProperty("uniqueId", out var mq) ? mq.GetString() ?? "" : "";
                    string mAvatar = root.TryGetProperty("avatar", out var ma) ? ma.GetString() ?? "" : "";
                    
                    if (string.IsNullOrWhiteSpace(mUser) || mUser == "Thí Chủ")
                    {
                        mUser = !string.IsNullOrWhiteSpace(mUnique) ? mUnique : "Thí Chủ Hữu Duyên";
                    }

                    string memberKey = (!string.IsNullOrEmpty(mUnique) ? mUnique : mUser).ToLowerInvariant();
                    if (!TextSanitizer.CheckAndRecordCooldown("member_greet_" + memberKey, 15000))
                    {
                        break;
                    }

                    _logger.LogInformation("[TikTokLive Member] Người xem vào phòng: {User} ({UniqueId})", mUser, mUnique);
                    _templeService.GreetMember(new GreetMemberParams
                    {
                        User = mUser,
                        UniqueId = mUnique,
                        Avatar = mAvatar,
                        ReadTts = true
                    });
                    break;

                case "chat":
                    string cUser = root.TryGetProperty("user", out var cu) ? cu.GetString() ?? "Thí Chủ" : "Thí Chủ";
                    string cUnique = root.TryGetProperty("uniqueId", out var cq) ? cq.GetString() ?? "" : "";
                    string cAvatar = root.TryGetProperty("avatar", out var ca) ? ca.GetString() ?? "" : "";
                    string comment = root.TryGetProperty("comment", out var cm) ? cm.GetString() ?? "" : "";
                    _templeService.HandleComment(comment, cUser, cUnique, cAvatar);
                    break;

                case "like":
                    string lUser = root.TryGetProperty("user", out var lu) ? lu.GetString() ?? "Thí Chủ" : "Thí Chủ";
                    string lUnique = root.TryGetProperty("uniqueId", out var lq) ? lq.GetString() ?? "" : "";
                    string lAvatar = root.TryGetProperty("avatar", out var la) ? la.GetString() ?? "" : "";
                    int lCount = root.TryGetProperty("count", out var lc) ? lc.GetInt32() : 1;

                    string lKey = (!string.IsNullOrEmpty(lUnique) ? lUnique : lUser).ToLowerInvariant();
                    bool shouldReadLikeTts = TextSanitizer.CheckAndRecordCooldown("like_tts_" + lKey, 8000);

                    _templeService.StrikeWoodenFish(new StrikeWoodenFishParams
                    {
                        User = lUser,
                        UniqueId = lUnique,
                        Avatar = lAvatar,
                        Count = lCount,
                        ReadTts = shouldReadLikeTts
                    });
                    break;

                case "follow":
                    string fUser = root.TryGetProperty("user", out var fu) ? fu.GetString() ?? "Thí Chủ" : "Thí Chủ";
                    string fUnique = root.TryGetProperty("uniqueId", out var fq) ? fq.GetString() ?? "" : "";
                    string fAvatar = root.TryGetProperty("avatar", out var fa) ? fa.GetString() ?? "" : "";
                    _logger.LogInformation("[TikTokLive Follow] Người xem follow kênh: {User} ({UniqueId})", fUser, fUnique);
                    _templeService.FollowChannel(new FollowChannelParams
                    {
                        User = fUser,
                        UniqueId = fUnique,
                        Avatar = fAvatar,
                        ReadTts = true
                    });
                    break;

                case "share":
                case "social":
                    string sUser = root.TryGetProperty("user", out var su) ? su.GetString() ?? "Thí Chủ" : "Thí Chủ";
                    string sUnique = root.TryGetProperty("uniqueId", out var sq) ? sq.GetString() ?? "" : "";
                    string sAvatar = root.TryGetProperty("avatar", out var sa) ? sa.GetString() ?? "" : "";
                    bool isBothiShare = _templeService.GetPublicState().Settings.Mode == "bothi";
                    if (isBothiShare)
                    {
                        _logger.LogInformation("[TikTokLive Share] Người xem chia sẻ live: {User} ({UniqueId})", sUser, sUnique);
                        _templeService.ShareStream(new ShareStreamParams
                        {
                            User = sUser,
                            UniqueId = sUnique,
                            Avatar = sAvatar,
                            ReadTts = true
                        });
                    }
                    else
                    {
                        _templeService.RingBell(new RingBellParams
                        {
                            User = sUser,
                            UniqueId = sUnique,
                            Avatar = sAvatar,
                            Count = 1,
                            Wish = "Hữu duyên tương ngộ, cảm ơn đã chia sẻ live",
                            ReadTts = false
                        });
                    }
                    break;

                case "gift":
                    string gUser = root.TryGetProperty("user", out var gu) ? gu.GetString() ?? "Thí Chủ" : "Thí Chủ";
                    string gUnique = root.TryGetProperty("uniqueId", out var gq) ? gq.GetString() ?? "" : "";
                    string gAvatar = root.TryGetProperty("avatar", out var ga) ? ga.GetString() ?? "" : "";
                    int gCoins = root.TryGetProperty("coins", out var gc) ? gc.GetInt32() : 10;
                    string gName = root.TryGetProperty("giftName", out var gn) ? gn.GetString() ?? "Lễ Vật Tâm Thành" : "Lễ Vật Tâm Thành";
                    _templeService.OfferGift(new OfferGiftParams
                    {
                        User = gUser,
                        UniqueId = gUnique,
                        Avatar = gAvatar,
                        Coins = gCoins,
                        GiftName = gName,
                        Wish = $"Thành tâm dâng {gName} kính lễ Đức Phật A Di Đà"
                    });
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[TikTokBridge] Parsing error: {Line}", line);
        }
    }

    public Task<TikTokState> DisconnectAsync()
    {
        lock (_lock)
        {
            StopProcess();
            _templeService.UpdateTikTokState(tt =>
            {
                tt.Connected = false;
                tt.Connecting = false;
                tt.ViewerCount = 0;
            });
        }
        return Task.FromResult(_templeService.GetPublicState().TikTok);
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

        try
        {
            if (OperatingSystem.IsWindows())
            {
                using var p = Process.Start(new ProcessStartInfo
                {
                    FileName = "wmic",
                    Arguments = "process where \"commandline like '%tiktok_bridge.js%'\" delete",
                    CreateNoWindow = true,
                    UseShellExecute = false
                });
                p?.WaitForExit(1500);
            }
        }
        catch { }
    }

    public void Dispose()
    {
        StopProcess();
    }
}
