using System.Text.Json;
using Temple.Server.Models;

namespace Temple.Server.Services;

public class TempleService : ITempleService
{
    private readonly ILogger<TempleService> _logger;
    private readonly ITtsService _ttsService;
    private readonly IGeminiService _geminiService;
    private readonly string _stateFilePath;
    private readonly object _lock = new();

    private TempleState _state = new();
    private Action<string, object>? _broadcaster;
    private CancellationTokenSource? _saveDebounceCts;

    public TempleService(ILogger<TempleService> logger, ITtsService ttsService, IGeminiService geminiService, IHostEnvironment env)
    {
        _logger = logger;
        _ttsService = ttsService;
        _geminiService = geminiService;

        string dataCandidate = Path.Combine(env.ContentRootPath, "data", "merit-state.json");
        _stateFilePath = File.Exists(dataCandidate) || Directory.Exists(Path.Combine(env.ContentRootPath, "data"))
            ? dataCandidate
            : Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "data", "merit-state.json"));
        LoadState();

        _ttsService.SetStatusListener((method, payload) => Broadcast(method, payload));
    }

    public void SetBroadcaster(Action<string, object> broadcaster)
    {
        _broadcaster = broadcaster;
    }

    public void Broadcast(string method, object payload)
    {
        _broadcaster?.Invoke(method, payload);
    }

    private void LoadState()
    {
        lock (_lock)
        {
            try
            {
                if (File.Exists(_stateFilePath))
                {
                    string json = File.ReadAllText(_stateFilePath);
                    var loaded = JsonSerializer.Deserialize<TempleState>(json);
                    if (loaded != null)
                    {
                        _state = loaded;
                        _state.TikTok ??= new TikTokState();
                        _state.Settings ??= new TempleSettings();
                        _state.Offerings ??= new OfferingsState();
                        _state.Devotees ??= new Dictionary<string, Devotee>(StringComparer.OrdinalIgnoreCase);
                        _state.RecentEvents ??= new List<TempleEvent>();
                        _logger.LogInformation("[TempleState] Đã nạp trạng thái từ file: {Path} ({DevoteeCount} Phật tử)",
                            _stateFilePath, _state.Devotees.Count);
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[TempleState] Lỗi đọc merit-state.json, dùng trạng thái mặc định");
            }

            _state = new TempleState();
        }
    }

    public Task SaveStateAsync()
    {
        _saveDebounceCts?.Cancel();
        _saveDebounceCts = new CancellationTokenSource();
        var token = _saveDebounceCts.Token;

        return Task.Run(async () =>
        {
            try
            {
                await Task.Delay(1000, token);
                if (token.IsCancellationRequested) return;

                string json;
                lock (_lock)
                {
                    json = JsonSerializer.Serialize(_state, new JsonSerializerOptions { WriteIndented = true });
                }

                string dir = Path.GetDirectoryName(_stateFilePath) ?? string.Empty;
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                await File.WriteAllTextAsync(_stateFilePath, json, token);
            }
            catch (OperationCanceledException) { }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[TempleState] Lỗi lưu merit-state.json");
            }
        }, token);
    }

    public static readonly string[] AuspiciousWishes =
    {
        "Cầu cho gia đạo bình an, phúc lộc dồi dào, vạn sự cát tường",
        "Cầu sức khỏe dồi dào, tâm an trí sáng, gia đình êm ấm",
        "Cầu công danh sự nghiệp thuận buồm xuôi gió, hanh thông tấn tới",
        "Cầu tài lộc hanh thông, tai qua nạn khỏi, sở nguyện tòng tâm",
        "Cầu thân tâm an lạc, phước thọ tăng long, vạn điều may mắn",
        "Cầu bách bệnh tiêu trừ, phước đức vô biên, vạn sự như ý"
    };

    public static readonly (string Word, string Meaning, string TtsWish)[] AuspiciousCalligraphy = new[]
    {
        ("PHÚC", "Phúc như Đông Hải, vạn sự hanh thông, gia đạo bình an", "Thầy khai bút tặng chữ PHÚC! Kính chúc thí chủ phúc như Đông Hải, vạn sự hanh thông, gia đình luôn ấm êm hạnh phúc!"),
        ("LỘC", "Tài lộc dồi dào, tiền vào như nước, kinh doanh phát đạt", "Thầy tặng thí chủ chữ LỘC! Cầu chúc tài lộc dồi dào, buôn may bán đắt, công việc hanh thông phát triển!"),
        ("THỌ", "Thọ tỷ Nam Sơn, bách niên giai lão, thân tâm an lạc", "Thầy tặng thí chủ chữ THỌ! Chúc thí chủ dồi dào sức khỏe, sống lâu trăm tuổi, thân tâm luôn an lạc tươi vui!"),
        ("AN", "Tâm an vạn sự an, bình an vô sự, thuận buồm xuôi gió", "Thầy tặng thí chủ chữ AN! Cầu chúc tâm an vạn sự an, cuộc sống luôn bình yên, thuận buồm xuôi gió!"),
        ("TÂM", "Tâm sáng chí bền, giữ trọn chữ tâm giữa cuộc đời", "Thầy tặng thí chủ chữ TÂM! Chúc thí chủ giữ tâm sáng trí trong, mọi điều thiện lành đều đơm hoa kết trái!"),
        ("TÀI", "Tấn tài tấn lộc, đại phú đại quý, may mắn ngập tràn", "Thầy tặng thí chủ chữ TÀI! Chúc thí chủ tấn tài tấn lộc, kinh doanh phát đạt, tiền của dồi dào!"),
        ("NHẪN", "Nhẫn nại kiên cường, một bước lùi mở ngàn biển lớn", "Thầy tặng thí chủ chữ NHẪN! Chúc thí chủ trí dũng song toàn, nhẫn nại vượt qua mọi thử thách để gặt hái thành công!"),
        ("ĐỨC", "Đức năng thắng số, tích đức hành thiện lưu quang muôn đời", "Thầy tặng thí chủ chữ ĐỨC! Đức năng thắng số, chúc thí chủ luôn tích nhiều phúc đức, vạn sự cát tường!"),
        ("CÁT TƯỜNG", "Vạn sự như ý, cát tường như nguyện, phúc lộc song toàn", "Thầy kính chúc thí chủ chữ CÁT TƯỜNG! Vạn sự như ý, tỷ sự như mơ, bốn mùa bình an thịnh vượng!"),
        ("DUYÊN", "Hữu duyên tương ngộ, vạn sự tùy duyên, hạnh phúc tràn đầy", "Thầy đề tặng chữ DUYÊN! Chúc thí chủ hữu duyên gặp được quý nhân phù trợ, gia đình hạnh phúc viên mãn!"),
        ("ĐỖ ĐẠT", "Bảng vàng đề tên, công danh rạng rỡ, học hành tấn tới", "Thầy tặng chữ ĐỖ ĐẠT! Chúc thí chủ công thành danh toại, thi cử đỗ đạt, học hành và sự nghiệp thăng hoa!"),
        ("PHÁT TÀI", "Khai xuân phát tài, mã đáo thành công, tiền tài rộng mở", "Thầy tặng chữ PHÁT TÀI! Chúc thí chủ năm mới phát tài phát lộc, vạn sự hanh thông thuận lợi!")
    };

    private Devotee RecordDevotee(string? user, string? uniqueId, string? avatar, long meritDelta, int incenseDelta = 0, int giftDelta = 0, int birdsDelta = 0, string wish = "")
    {
        string displayName = TextSanitizer.SanitizeUserName(user ?? uniqueId);
        string cleanWish = TextSanitizer.SanitizeWishText(wish);
        string key = (string.IsNullOrWhiteSpace(uniqueId) ? displayName : uniqueId);
        if (key.Length > 40) key = key[..40];

        if (!_state.Devotees.TryGetValue(key, out var dev))
        {
            dev = new Devotee
            {
                Name = displayName,
                UniqueId = string.IsNullOrWhiteSpace(uniqueId) ? displayName.ToLowerInvariant().Replace(" ", "") : uniqueId,
                Avatar = avatar ?? string.Empty,
                Merit = 0,
                Incense = 0,
                Gifts = 0,
                BirdsReleased = 0,
                LastWish = string.Empty
            };
            _state.Devotees[key] = dev;
        }

        if (!string.IsNullOrWhiteSpace(displayName) && displayName != "Thí Chủ Hữu Duyên" && !displayName.Equals(uniqueId, StringComparison.OrdinalIgnoreCase))
        {
            dev.Name = displayName;
        }
        else if (string.IsNullOrWhiteSpace(dev.Name) || dev.Name == "Thí Chủ Hữu Duyên")
        {
            dev.Name = displayName;
        }
        if (!string.IsNullOrEmpty(avatar)) dev.Avatar = avatar;
        dev.Merit += meritDelta;
        dev.Incense += incenseDelta;
        dev.Gifts += giftDelta;
        dev.BirdsReleased += birdsDelta;
        if (!string.IsNullOrEmpty(cleanWish)) dev.LastWish = cleanWish;

        _state.TotalMerit += meritDelta;
        _state.HaloIntensity = Math.Min(1.0, 0.35 + (_state.TotalMerit % 1000) / 1400.0);

        return dev;
    }

    private TempleEvent PushEvent(TempleEvent evt)
    {
        _state.RecentEvents.Insert(0, evt);
        if (_state.RecentEvents.Count > 35)
        {
            _state.RecentEvents.RemoveRange(35, _state.RecentEvents.Count - 35);
        }
        return evt;
    }

    public List<LeaderboardItem> GetLeaderboard(int limit = 24)
    {
        lock (_lock)
        {
            return _state.Devotees.Values
                .OrderByDescending(d => _state.Settings.Mode == "phongsinh" ? d.BirdsReleased : d.Merit)
                .Take(limit)
                .Select((d, idx) => new LeaderboardItem
                {
                    Rank = idx + 1,
                    Name = d.Name,
                    UniqueId = d.UniqueId,
                    Avatar = d.Avatar,
                    Merit = d.Merit,
                    Incense = d.Incense,
                    BirdsReleased = d.BirdsReleased,
                    LastWish = d.LastWish
                })
                .ToList();
        }
    }

    public PublicTempleState GetPublicState()
    {
        lock (_lock)
        {
            return new PublicTempleState
            {
                TotalIncense = _state.TotalIncense,
                TotalMerit = _state.TotalMerit,
                WoodenFishHits = _state.WoodenFishHits,
                BellRings = _state.BellRings,
                LanternCount = _state.LanternCount,
                FortuneCount = _state.FortuneCount,
                TotalBeerMoney = _state.TotalBeerMoney,
                TotalHearts = _state.TotalHearts,
                TotalFollows = _state.TotalFollows,
                TotalShares = _state.TotalShares,
                TotalBirdsReleased = _state.TotalBirdsReleased,
                TotalCalligraphyWords = _state.TotalCalligraphyWords,
                ActiveIncenseSticks = _state.ActiveIncenseSticks,
                HaloIntensity = _state.HaloIntensity,
                Offerings = new OfferingsState
                {
                    Lotus = _state.Offerings.Lotus,
                    Fruit = _state.Offerings.Fruit,
                    Lamp = _state.Offerings.Lamp,
                    Dragon = _state.Offerings.Dragon
                },
                Leaderboard = GetLeaderboard(24),
                RecentEvents = _state.RecentEvents.Take(15).ToList(),
                Settings = _state.Settings,
                TikTok = _state.TikTok,
                Tts = _ttsService.GetStatus()
            };
        }
    }

    public TempleEventResult BurnIncense(BurnIncenseParams p)
    {
        lock (_lock)
        {
            string user = TextSanitizer.SanitizeUserName(p.User);
            string uniqueId = p.UniqueId ?? string.Empty;
            string avatar = p.Avatar ?? string.Empty;
            int count = Math.Clamp(p.Count <= 0 ? 3 : p.Count, 1, 9);
            string wish = TextSanitizer.SanitizeWishText(p.Wish);
            if (string.IsNullOrEmpty(wish)) wish = "Thành tâm dâng hương bái Phật, cầu bình an cát tường";
            int merit = count * 5;

            _state.TotalIncense += count;
            _state.ActiveIncenseSticks = Math.Min(36, _state.ActiveIncenseSticks + count);
            var dev = RecordDevotee(user, uniqueId, avatar, merit, count, 0, 0, wish);

            bool isBothi = _state.Settings.Mode == "bothi";
            string ttsText;
            if (p.ReadTts == false)
            {
                ttsText = string.Empty;
            }
            else if (!string.IsNullOrEmpty(p.CustomTts))
            {
                ttsText = p.CustomTts;
            }
            else if (isBothi)
            {
                ttsText = $"Chào {dev.Name}, nhờ anh chị cho em xin vài đồng, tim hoặc bấm follow để em có tiền đi uống bia.";
            }
            else if (wish.Contains("Chánh Điện") || wish.Contains("vào phòng"))
            {
                ttsText = $"Nam mô A Di Đà Phật. Chùa Thiên Sơn xin kính chào thí chủ {dev.Name} đã vào Chánh Điện bái Phật.";
            }
            else
            {
                ttsText = $"Nam mô A Di Đà Phật. Cảm tạ thí chủ {dev.Name} đã thành tâm thắp {count} nén hương thơm. {wish}.";
            }

            var evt = PushEvent(new TempleEvent
            {
                Type = isBothi ? "bothiGreet" : "burnIncense",
                User = dev.Name,
                UniqueId = dev.UniqueId,
                Avatar = dev.Avatar,
                Count = count,
                Merit = merit,
                Wish = wish,
                TtsText = ttsText,
                TtsVoice = _state.Settings.TtsVoice ?? "maichi"
            });

            _ = SaveStateAsync();
            var state = GetPublicState();
            var result = new TempleEventResult { Event = evt, State = state };
            Broadcast("temple.event", result);
            return result;
        }
    }

    public TempleEventResult StrikeWoodenFish(StrikeWoodenFishParams p)
    {
        string mode = _state.Settings.Mode;
        if (mode == "bothi" || mode == "phongsinh" || mode == "xinchu")
        {
            return CommonThankYou(p.User, p.UniqueId, p.Avatar, "heart", p.Count, 0, null, p.ReadTts ?? true, p.TtsText);
        }

        lock (_lock)
        {
            string user = TextSanitizer.SanitizeUserName(p.User);
            string uniqueId = p.UniqueId ?? string.Empty;
            string avatar = p.Avatar ?? string.Empty;
            int count = Math.Clamp(p.Count <= 0 ? 1 : p.Count, 1, 50);
            int merit = count;

            _state.WoodenFishHits += count;
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 0, 0, 0);

            string ttsText = p.TtsText ?? string.Empty;

            var evt = PushEvent(new TempleEvent
            {
                Type = "strikeWoodenFish",
                User = dev.Name,
                UniqueId = dev.UniqueId,
                Avatar = dev.Avatar,
                Count = count,
                Merit = merit,
                Wish = $"Đã gõ mõ {count} nhịp cầu công đức! 🪷",
                TtsText = ttsText,
                TtsVoice = _state.Settings.TtsVoice ?? "maichi"
            });

            _ = SaveStateAsync();
            var state = GetPublicState();
            var result = new TempleEventResult { Event = evt, State = state };
            Broadcast("temple.event", result);
            return result;
        }
    }

    public TempleEventResult RingBell(RingBellParams p)
    {
        lock (_lock)
        {
            string user = TextSanitizer.SanitizeUserName(p.User);
            string uniqueId = p.UniqueId ?? string.Empty;
            string avatar = p.Avatar ?? string.Empty;
            int count = Math.Clamp(p.Count <= 0 ? 1 : p.Count, 1, 9);
            string wish = TextSanitizer.SanitizeWishText(p.Wish);
            if (string.IsNullOrEmpty(wish)) wish = "Thỉnh chuông Bát Nhã, phiền não tiêu tan, trí tuệ sáng ngời";
            int merit = count * 10;

            _state.BellRings += count;
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 0, 0, 0, wish);

            string ttsText = (p.ReadTts == true)
                ? $"Thí chủ {dev.Name} thỉnh Đại Hồng Chung cầu nguyện: {wish}."
                : string.Empty;

            var evt = PushEvent(new TempleEvent
            {
                Type = "ringBell",
                User = dev.Name,
                UniqueId = dev.UniqueId,
                Avatar = dev.Avatar,
                Count = count,
                Merit = merit,
                Wish = wish,
                TtsText = ttsText,
                TtsVoice = _state.Settings.TtsVoice ?? "maichi"
            });

            _ = SaveStateAsync();
            var state = GetPublicState();
            var result = new TempleEventResult { Event = evt, State = state };
            Broadcast("temple.event", result);
            return result;
        }
    }

    public TempleEventResult SendPrayer(SendPrayerParams p)
    {
        lock (_lock)
        {
            string user = TextSanitizer.SanitizeUserName(p.User);
            string uniqueId = p.UniqueId ?? string.Empty;
            string avatar = p.Avatar ?? string.Empty;
            string wish = TextSanitizer.SanitizeWishText(p.Wish);
            if (string.IsNullOrEmpty(wish)) wish = "Cầu cho quốc thái dân an, gia đình mạnh khỏe hạnh phúc";
            int merit = 10;

            _state.LanternCount += 1;
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 1, 0, 0, wish);

            string ttsText = (p.ReadTts == false)
                ? string.Empty
                : $"Lời cầu nguyện của thí chủ {dev.Name}: {wish}. Nam mô A Di Đà Phật.";

            var evt = PushEvent(new TempleEvent
            {
                Type = "sendPrayer",
                User = dev.Name,
                UniqueId = dev.UniqueId,
                Avatar = dev.Avatar,
                Wish = wish,
                Merit = merit,
                TtsText = ttsText,
                TtsVoice = _state.Settings.TtsVoice ?? "maichi"
            });

            _ = SaveStateAsync();
            var state = GetPublicState();
            var result = new TempleEventResult { Event = evt, State = state };
            Broadcast("temple.event", result);
            return result;
        }
    }

    public TempleEventResult FollowChannel(FollowChannelParams p)
    {
        return CommonThankYou(p.User, p.UniqueId, p.Avatar, "follow", 1, 0, null, p.ReadTts ?? true, p.CustomTts);
    }

    public TempleEventResult ShareStream(ShareStreamParams p)
    {
        return CommonThankYou(p.User, p.UniqueId, p.Avatar, "share", 1, 0, null, p.ReadTts ?? true, p.CustomTts);
    }

    public TempleEventResult GreetMember(GreetMemberParams p)
    {
        lock (_lock)
        {
            string user = TextSanitizer.SanitizeUserName(p.User);
            string uniqueId = p.UniqueId ?? string.Empty;
            string avatar = p.Avatar ?? string.Empty;
            string mode = _state.Settings.Mode;

            string wish = !string.IsNullOrWhiteSpace(p.Wish)
                ? p.Wish
                : AuspiciousWishes[Random.Shared.Next(AuspiciousWishes.Length)];

            var dev = RecordDevotee(user, uniqueId, avatar, 10, 0, 0, 0, wish);

            string ttsText;
            string wishText;
            string evtType;
            string? calligraphyWord = null;
            string? calligraphyMeaning = null;

            if (mode == "phongsinh")
            {
                ttsText = $"Chào mừng {dev.Name} đã đến với buổi phóng sinh chim tích đức! {wish}. Hãy cùng nhau thả chim để tạo phước lành!";
                wishText = "Chào mừng tham gia phóng sinh chim tích đức! 🕊️";
                evtType = "phongsinhGreet";
            }
            else if (mode == "bothi")
            {
                ttsText = $"Chào {dev.Name}, nhờ anh chị cho em xin vài đồng, tim hoặc bấm follow để em có tiền đi uống bia. {wish}!";
                wishText = "Nhờ anh/chị cho em xin vài đồng, tim hoặc follow để có tiền đi uống bia! 🍺🙏";
                evtType = "bothiGreet";
            }
            else if (mode == "xinchu")
            {
                ttsText = $"Thầy Đồ kính chào {dev.Name} đã ghé gian hàng xin chữ! Nhờ thí chủ cho em xin vài đồng, thả tim hoặc follow để thầy đoán trọn quẻ, viết chữ giải hạn nghênh tài lộc ạ! {wish}.";
                wishText = "Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để thầy đoán trọn quẻ, viết chữ giải hạn ạ! 🔮🌸🙏";
                evtType = "xinchuGreet";
            }
            else
            {
                ttsText = $"Nam mô A Di Đà Phật. Chùa Thiên Sơn kính chào thí chủ {dev.Name} đã vào Chánh Điện bái Phật. {wish}.";
                wishText = $"Đã vào Chánh Điện bái Phật 🪷";
                evtType = "templeGreet";
            }

            if (p.ReadTts == false)
            {
                ttsText = string.Empty;
            }

            var evt = PushEvent(new TempleEvent
            {
                Type = evtType,
                User = dev.Name,
                UniqueId = dev.UniqueId,
                Avatar = dev.Avatar,
                Count = 1,
                Merit = 10,
                Wish = wishText,
                CalligraphyWord = calligraphyWord,
                CalligraphyMeaning = calligraphyMeaning,
                TtsText = ttsText,
                TtsVoice = _state.Settings.TtsVoice ?? "maichi"
            });

            _ = SaveStateAsync();
            var state = GetPublicState();
            var result = new TempleEventResult { Event = evt, State = state };
            Broadcast("temple.event", result);
            return result;
        }
    }

    public TempleEventResult ReleaseBirds(ReleaseBirdsParams p)
    {
        int count = Math.Max(1, p.Count);
        return CommonThankYou(
            p.User,
            p.UniqueId,
            p.Avatar,
            "bonus",
            count: count,
            coins: Math.Max(1, count / 5),
            giftName: $"{count} Chú Chim Tự Do",
            readTts: p.ReadTts ?? true,
            customWish: p.Wish);
    }

    public async Task<TempleEventResult> RequestCalligraphyAsync(RequestCalligraphyParams p)
    {
        string user = TextSanitizer.SanitizeUserName(p.User);
        string uniqueId = p.UniqueId ?? string.Empty;
        string avatar = p.Avatar ?? string.Empty;
        string intent = !string.IsNullOrWhiteSpace(p.Intent) 
            ? TextSanitizer.SanitizeWishText(p.Intent) 
            : (!string.IsNullOrWhiteSpace(p.Wish) ? TextSanitizer.SanitizeWishText(p.Wish) : "Cầu bình an tài lộc may mắn");
        string requestedWord = (p.Word ?? string.Empty).Trim().ToUpperInvariant();

        // Gửi lên AI Gemini để lý giải chữ gắn liền với việc thí chủ định làm
        var divination = await _geminiService.DivineCalligraphyAsync(user, intent, requestedWord);

        lock (_lock)
        {
            string word = !string.IsNullOrWhiteSpace(divination.Word) ? divination.Word : (string.IsNullOrWhiteSpace(requestedWord) ? "PHÚC" : requestedWord);
            string hexTitle = !string.IsNullOrWhiteSpace(divination.HexagramTitle) ? divination.HexagramTitle : "Quẻ Thượng Cát • Vạn Sự Hanh Thông";
            string meaning = !string.IsNullOrWhiteSpace(divination.DivinationExplanation) ? divination.DivinationExplanation : "Chữ đại cát trợ duyên mưu sự thành công.";
            string advice = divination.ActionAdvice ?? "Giữ tâm sáng trí bền ắt gặp quý nhân phù trợ.";

            int merit = 25;
            _state.TotalCalligraphyWords += 1;
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 0, 1, 0, $"Bói chữ {word}: {intent}");

            string ttsText = (p.ReadTts == false)
                ? string.Empty
                : (!string.IsNullOrWhiteSpace(p.CustomTts)
                    ? p.CustomTts
                    : divination.TtsReading);

            var evt = PushEvent(new TempleEvent
            {
                Type = "xinchuDivination",
                User = dev.Name,
                UniqueId = dev.UniqueId,
                Avatar = dev.Avatar,
                Count = 1,
                Merit = merit,
                Wish = $"{hexTitle} - Thầy bói cho chữ {word} 🔮📜",
                CalligraphyWord = word,
                CalligraphyMeaning = meaning,
                ActionIntent = intent,
                HexagramTitle = hexTitle,
                ActionAdvice = advice,
                TtsText = ttsText,
                TtsVoice = _state.Settings.TtsVoice ?? "maichi"
            });

            _ = SaveStateAsync();
            var state = GetPublicState();
            var result = new TempleEventResult { Event = evt, State = state };
            Broadcast("temple.event", result);
            return result;
        }
    }

    public TempleEventResult RequestCalligraphy(RequestCalligraphyParams p)
    {
        return RequestCalligraphyAsync(p).GetAwaiter().GetResult();
    }

    public TempleEventResult CommonThankYou(
        string? user,
        string? uniqueId,
        string? avatar,
        string actionType,
        int count = 1,
        int coins = 0,
        string? giftName = null,
        bool readTts = true,
        string? customTts = null,
        string? customWish = null)
    {
        lock (_lock)
        {
            string cleanUser = TextSanitizer.SanitizeUserName(user);
            string cleanUniqueId = uniqueId ?? string.Empty;
            string cleanAvatar = avatar ?? string.Empty;
            string mode = _state.Settings.Mode;

            long merit = 0;
            int incenseDelta = 0;
            int giftDelta = 0;
            int birdsDelta = 0;

            string ttsText = string.Empty;
            string wishText = string.Empty;
            string evtType = string.Empty;
            string? calligraphyWord = null;
            string? calligraphyMeaning = null;

            switch (actionType)
            {
                case "follow":
                    merit = 20;
                    _state.TotalFollows += 1;
                    if (mode == "phongsinh")
                    {
                        birdsDelta = 20;
                        _state.TotalBirdsReleased += birdsDelta;
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã bấm follow kênh để cùng chung tay phóng sinh chim tích đức! Chúc anh chị vạn sự cát tường, phước báu vô lượng!";
                        wishText = "Đã follow kênh chung tay phóng sinh chim! 🕊️➕";
                        evtType = "phongsinhFollow";
                    }
                    else if (mode == "bothi")
                    {
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã bấm follow kênh để ủng hộ em kiếm tiền đi uống bia! Chúc anh chị luôn vui vẻ và nhiều may mắn!";
                        wishText = "Đã follow kênh ủng hộ em uống bia! 🍺➕";
                        evtType = "bothiFollow";
                    }
                    else if (mode == "xinchu")
                    {
                        var picked = AuspiciousCalligraphy[Random.Shared.Next(AuspiciousCalligraphy.Length)];
                        calligraphyWord = picked.Word;
                        calligraphyMeaning = picked.Meaning;
                        _state.TotalCalligraphyWords += 1;
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã bấm follow kết duyên lành! Thầy khai bút tặng chữ {picked.Word}! {picked.Meaning}!";
                        wishText = $"Đã follow! Thầy tặng chữ {picked.Word} 📜✨";
                        evtType = "xinchuFollow";
                    }
                    else
                    {
                        ttsText = $"Nam mô A Di Đà Phật. Cảm tạ thí chủ {cleanUser} đã theo dõi đạo tràng Chùa Thiên Sơn. Nguyện cầu chư Phật gia hộ cho thí chủ vạn sự cát tường.";
                        wishText = "Đã theo dõi đạo tràng Chùa Thiên Sơn 🪷➕";
                        evtType = "templeFollow";
                    }
                    break;

                case "heart":
                case "like":
                    count = Math.Clamp(count <= 0 ? 1 : count, 1, 50);
                    merit = count;
                    _state.TotalHearts += count;
                    if (mode == "phongsinh")
                    {
                        birdsDelta = count;
                        _state.TotalBirdsReleased += birdsDelta;
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã thả {count} tim trợ duyên phóng sinh đàn chim về với tự do! Chúc anh chị luôn vui vẻ và nhiều may mắn!";
                        wishText = $"Đã thả {count} tim trợ duyên phóng sinh chim! ❤️🕊️";
                        evtType = "phongsinhHeart";
                    }
                    else if (mode == "bothi")
                    {
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã thả {count} tim ủng hộ em kiếm tiền uống bia!";
                        wishText = "Đã thả tim ủng hộ em kiếm tiền uống bia! ❤️🍺";
                        evtType = "bothiHeart";
                    }
                    else if (mode == "xinchu")
                    {
                        var picked = AuspiciousCalligraphy[Random.Shared.Next(AuspiciousCalligraphy.Length)];
                        calligraphyWord = picked.Word;
                        calligraphyMeaning = picked.Meaning;
                        _state.TotalCalligraphyWords += 1;
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã thả {count} tim trợ duyên! Thầy hạ bút đề tặng chữ {picked.Word} chúc {picked.Meaning}!";
                        wishText = $"Thả {count} tim! Thầy đề tặng chữ {picked.Word} ❤️📜";
                        evtType = "xinchuHeart";
                    }
                    else
                    {
                        _state.WoodenFishHits += count;
                        ttsText = $"Nam mô A Di Đà Phật. Cảm tạ thí chủ {cleanUser} đã thả {count} tim hoan hỷ trợ duyên đạo tràng.";
                        wishText = $"Đã thả {count} tim gõ mõ công đức! ❤️🪷";
                        evtType = "strikeWoodenFish";
                    }
                    break;

                case "bonus":
                case "gift":
                    coins = Math.Max(1, coins);
                    giftDelta = 1;
                    int multiplier = coins >= 100 ? 50 : coins >= 10 ? 30 : 20;
                    merit = Math.Max(20, coins * multiplier);

                    if (mode == "phongsinh")
                    {
                        birdsDelta = count > 1 ? count : (coins * 5);
                        _state.TotalBirdsReleased += birdsDelta;
                        giftName ??= $"{coins} Đồng Công Đức";
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã ủng hộ {coins} đồng phóng sinh thêm {birdsDelta} chú chim tích đức! Công đức vô lượng, cầu chúc anh chị vạn điều như ý!";
                        wishText = $"Ủng hộ {coins} đồng phóng sinh {birdsDelta} chú chim! 🕊️✨";
                        evtType = "phongsinhRelease";
                    }
                    else if (mode == "bothi")
                    {
                        _state.TotalBeerMoney += coins;
                        giftName ??= $"{coins} Đồng Tiền Lẻ";
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã bố thí {coins} đồng để em có tiền đi uống bia! Chúc anh chị luôn dồi dào sức khỏe và gặp nhiều may mắn!";
                        wishText = $"Bố thí {coins} đồng để em đi uống bia 🍺";
                        evtType = "bothiDonate";
                    }
                    else if (mode == "xinchu")
                    {
                        var picked = AuspiciousCalligraphy[Random.Shared.Next(AuspiciousCalligraphy.Length)];
                        calligraphyWord = picked.Word;
                        calligraphyMeaning = picked.Meaning;
                        _state.TotalCalligraphyWords += 1;
                        giftName ??= $"{coins} Đồng Gieo Duyên";
                        ttsText = $"Đa tạ thí chủ {cleanUser} đã gieo duyên công đức {coins} đồng! Thầy khai bút tặng bức đại tự chữ {picked.Word}! Cầu chúc {picked.Meaning}!";
                        wishText = $"Gieo duyên {coins} đồng! Thầy hạ bút tặng chữ {picked.Word} 📜🌸";
                        evtType = "xinchuGift";
                    }
                    else
                    {
                        incenseDelta = 3;
                        _state.TotalIncense += 3;
                        _state.ActiveIncenseSticks = Math.Min(36, _state.ActiveIncenseSticks + 3);
                        string gType = coins >= 100 ? "dragon" : coins >= 20 ? "fruit" : coins >= 5 ? "lamp" : "lotus";
                        if (gType == "lotus") _state.Offerings.Lotus++;
                        else if (gType == "fruit") _state.Offerings.Fruit++;
                        else if (gType == "lamp") _state.Offerings.Lamp++;
                        else if (gType == "dragon") _state.Offerings.Dragon++;

                        giftName ??= (gType == "dragon" ? "Đại Lễ Kim Long Chầu Phật" : gType == "fruit" ? "Mâm Ngũ Quả Cát Tường" : gType == "lamp" ? "Đèn Lưu Ly Trí Tuệ" : "Đài Hoa Sen Vàng");
                        ttsText = $"Công đức vô lượng! Cảm tạ thí chủ {cleanUser} đã phát tâm dâng cúng {giftName}, tích thêm {merit} điểm công đức. Nguyện cầu chư Phật gia hộ cho thí chủ vạn sự cát tường như ý.";
                        wishText = $"Dâng cúng {giftName} lên Tam Bảo";
                        evtType = (gType == "dragon" || coins >= 100) ? "grandCeremony" : "offerGift";
                    }
                    break;

                case "share":
                    merit = 25;
                    _state.TotalShares += 1;
                    if (mode == "phongsinh")
                    {
                        birdsDelta = 25;
                        _state.TotalBirdsReleased += birdsDelta;
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã chia sẻ buổi live lan tỏa phước báu phóng sinh chim đến muôn nơi!";
                        wishText = "Đã chia sẻ buổi live phóng sinh chim! 🔄🕊️";
                        evtType = "phongsinhShare";
                    }
                    else if (mode == "bothi")
                    {
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã chia sẻ buổi live giúp em kiếm tiền đi uống bia! Chúc anh chị luôn vui vẻ và thật nhiều may mắn!";
                        wishText = "Đã chia sẻ live giúp em kiếm tiền uống bia! 🔄🍺";
                        evtType = "bothiShare";
                    }
                    else if (mode == "xinchu")
                    {
                        var picked = AuspiciousCalligraphy[Random.Shared.Next(AuspiciousCalligraphy.Length)];
                        calligraphyWord = picked.Word;
                        calligraphyMeaning = picked.Meaning;
                        _state.TotalCalligraphyWords += 1;
                        ttsText = $"Cảm ơn anh chị {cleanUser} đã chia sẻ buổi xin chữ lan tỏa duyên may! Thầy đề tặng chữ {picked.Word}! Chúc {picked.Meaning}!";
                        wishText = $"Chia sẻ live xin chữ! Thầy tặng chữ {picked.Word} 🔄📜";
                        evtType = "xinchuShare";
                    }
                    else
                    {
                        ttsText = $"Nam mô A Di Đà Phật. Cảm tạ thí chủ {cleanUser} đã chia sẻ buổi phát trực tiếp. Nguyện cầu Phật gia hộ cho thí chủ vạn sự cát tường.";
                        wishText = "Đã chia sẻ buổi live đạo tràng! 🔄🪷";
                        evtType = "templeShare";
                    }
                    break;
            }

            if (!string.IsNullOrEmpty(customWish)) wishText = customWish;
            if (!string.IsNullOrEmpty(customTts)) ttsText = customTts;
            if (!readTts) ttsText = string.Empty;

            var dev = RecordDevotee(cleanUser, cleanUniqueId, cleanAvatar, merit, incenseDelta, giftDelta, birdsDelta, wishText);

            var evt = PushEvent(new TempleEvent
            {
                Type = evtType,
                User = dev.Name,
                UniqueId = dev.UniqueId,
                Avatar = dev.Avatar,
                Count = count,
                Coins = coins > 0 ? coins : null,
                GiftName = giftName,
                Merit = merit,
                Wish = wishText,
                CalligraphyWord = calligraphyWord,
                CalligraphyMeaning = calligraphyMeaning,
                TtsText = ttsText,
                TtsVoice = _state.Settings.TtsVoice ?? "maichi"
            });

            _ = SaveStateAsync();
            var state = GetPublicState();
            var result = new TempleEventResult { Event = evt, State = state };
            Broadcast("temple.event", result);
            return result;
        }
    }

    public TempleEventResult OfferGift(OfferGiftParams p)
    {
        string mode = _state.Settings.Mode;
        if (mode == "bothi" || mode == "phongsinh" || mode == "xinchu")
        {
            return CommonThankYou(p.User, p.UniqueId, p.Avatar, "bonus", 1, p.Coins, p.GiftName, p.ReadTts ?? true, null, p.Wish);
        }

        lock (_lock)
        {
            string user = TextSanitizer.SanitizeUserName(p.User);
            string uniqueId = p.UniqueId ?? string.Empty;
            string avatar = p.Avatar ?? string.Empty;
            int coins = Math.Max(1, p.Coins);

            string giftType = p.GiftType switch
            {
                "dragon" => "dragon",
                "fruit" => "fruit",
                "lamp" => "lamp",
                "lotus" => "lotus",
                _ => (coins >= 100 ? "dragon" : coins >= 20 ? "fruit" : coins >= 5 ? "lamp" : "lotus")
            };

            var giftLabels = new Dictionary<string, string>
            {
                ["lotus"] = "Đài Hoa Sen Vàng",
                ["fruit"] = "Mâm Ngũ Quả Cát Tường",
                ["lamp"] = "Đèn Lưu Ly Trí Tuệ",
                ["dragon"] = "Đại Lễ Kim Long Chầu Phật"
            };

            string giftName = p.GiftName ?? giftLabels[giftType];
            int multiplier = coins >= 100 ? 50 : coins >= 10 ? 30 : 20;
            int merit = Math.Max(20, coins * multiplier);

            if (giftType == "lotus") _state.Offerings.Lotus++;
            else if (giftType == "fruit") _state.Offerings.Fruit++;
            else if (giftType == "lamp") _state.Offerings.Lamp++;
            else if (giftType == "dragon") _state.Offerings.Dragon++;

            _state.TotalIncense += 3;
            _state.ActiveIncenseSticks = Math.Min(36, _state.ActiveIncenseSticks + 3);

            string wish = p.Wish ?? $"Dâng cúng {giftName} lên Tam Bảo";
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 3, 1, 0, wish);

            string ttsText = (p.ReadTts == false)
                ? string.Empty
                : $"Công đức vô lượng! Cảm tạ thí chủ {dev.Name} đã phát tâm dâng cúng {giftName}, tích thêm {merit} điểm công đức. Nguyện cầu chư Phật gia hộ cho thí chủ vạn sự cát tường như ý.";

            var evt = PushEvent(new TempleEvent
            {
                Type = giftType == "dragon" ? "grandCeremony" : "offerGift",
                User = dev.Name,
                UniqueId = dev.UniqueId,
                Avatar = dev.Avatar,
                GiftType = giftType,
                GiftName = giftName,
                Coins = coins,
                Merit = merit,
                Wish = wish,
                TtsText = ttsText,
                TtsVoice = _state.Settings.TtsVoice ?? "maichi"
            });

            _ = SaveStateAsync();
            var state = GetPublicState();
            var result = new TempleEventResult { Event = evt, State = state };
            Broadcast("temple.event", result);
            return result;
        }
    }

    public TempleEventResult DrawFortune(DrawFortuneParams p)
    {
        lock (_lock)
        {
            string user = TextSanitizer.SanitizeUserName(p.User);
            string uniqueId = p.UniqueId ?? string.Empty;
            string avatar = p.Avatar ?? string.Empty;
            string topic = TextSanitizer.SanitizeWishText(p.Topic);
            if (string.IsNullOrEmpty(topic)) topic = "Gia đạo, Tài lộc và Bình an";

            var fortune = FortuneDeck.DrawRandom();
            int merit = 10;

            _state.FortuneCount += 1;
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 0, 0, 0, $"Xin xăm: Quẻ số {fortune.Number} ({fortune.Rank})");

            string ttsText = (p.ReadTts == false)
                ? string.Empty
                : $"Thí chủ {dev.Name} vừa gieo được {fortune.TtsSummary}";

            var evt = PushEvent(new TempleEvent
            {
                Type = "drawFortune",
                User = dev.Name,
                UniqueId = dev.UniqueId,
                Avatar = dev.Avatar,
                Topic = topic,
                Fortune = fortune,
                Merit = merit,
                TtsText = ttsText,
                TtsVoice = _state.Settings.TtsVoice ?? "maichi"
            });

            _ = SaveStateAsync();
            var state = GetPublicState();
            var result = new TempleEventResult { Event = evt, State = state };
            Broadcast("temple.event", result);
            return result;
        }
    }

    public TempleEventResult GrandCeremony(OfferGiftParams p)
    {
        p.GiftType = "dragon";
        p.Coins = Math.Max(100, p.Coins <= 0 ? 199 : p.Coins);
        p.GiftName ??= "Đại Lễ Hào Quang Vạn Trượng";
        return OfferGift(p);
    }

    public PublicTempleState UpdateSettings(JsonElement p)
    {
        lock (_lock)
        {
            if (p.TryGetProperty("ttsEnabled", out var ttsE)) _state.Settings.TtsEnabled = ttsE.GetBoolean();
            if (p.TryGetProperty("ttsVoice", out var ttsV)) _state.Settings.TtsVoice = ttsV.GetString() ?? "maichi";
            if (p.TryGetProperty("bgMusicEnabled", out var bgM)) _state.Settings.BgMusicEnabled = bgM.GetBoolean();
            if (p.TryGetProperty("sfxEnabled", out var sfxE)) _state.Settings.SfxEnabled = sfxE.GetBoolean();
            if (p.TryGetProperty("smokeDensity", out var smkD)) _state.Settings.SmokeDensity = smkD.GetDouble();
            if (p.TryGetProperty("autoSim", out var aSim)) _state.Settings.AutoSim = aSim.GetBoolean();
            if (p.TryGetProperty("autoSimIntervalMs", out var aSimInt)) _state.Settings.AutoSimIntervalMs = aSimInt.GetInt32();
            if (p.TryGetProperty("youtubeUrl", out var ytUrl))
            {
                _state.Settings.YoutubeUrl = ytUrl.ValueKind == JsonValueKind.Null ? null : ytUrl.GetString();
            }
            if (p.TryGetProperty("mode", out var md))
            {
                _state.Settings.Mode = md.GetString() ?? "temple";
            }

            _ = SaveStateAsync();
            var state = GetPublicState();
            Broadcast("temple.state", state);
            return state;
        }
    }

    public PublicTempleState ResetMerit()
    {
        lock (_lock)
        {
            _state.TotalIncense = 9;
            _state.TotalMerit = 0;
            _state.WoodenFishHits = 0;
            _state.BellRings = 0;
            _state.LanternCount = 0;
            _state.FortuneCount = 0;
            _state.ActiveIncenseSticks = 3;
            _state.Offerings = new OfferingsState { Lotus = 1, Fruit = 1, Lamp = 1, Dragon = 0 };
            _state.Devotees.Clear();
            _state.RecentEvents.Clear();

            _ = SaveStateAsync();
            var state = GetPublicState();
            Broadcast("temple.state", state);
            return state;
        }
    }

    public object? HandleComment(string? comment, string? user, string? uniqueId, string? avatar)
    {
        if (string.IsNullOrWhiteSpace(comment) || TextSanitizer.IsBlockedSpamOrToxic(comment))
        {
            return null;
        }

        string cleanWish = TextSanitizer.SanitizeWishText(comment);
        if (string.IsNullOrWhiteSpace(cleanWish) || cleanWish.Length < 3)
        {
            return null;
        }

        string userKey = uniqueId ?? user ?? string.Empty;
        if (!TextSanitizer.CheckAndRecordCooldown(userKey, 3500))
        {
            return null;
        }

        string cleanUser = TextSanitizer.SanitizeUserName(user);
        string lower = cleanWish.ToLowerInvariant();

        // 1. Xin xăm / Gieo quẻ (chỉ bắt các cụm từ xin quẻ chính xác)
        if (lower.Contains("xin xăm") || lower.Contains("xin xam") ||
            lower.Contains("gieo quẻ") || lower.Contains("gieo que") ||
            lower.Contains("rút quẻ") || lower.Contains("rut que") ||
            lower.Contains("xin quẻ") || lower.Contains("xin que") ||
            lower.Contains("bốc quẻ") || lower.Contains("boc que"))
        {
            return DrawFortune(new DrawFortuneParams { User = cleanUser, UniqueId = uniqueId, Avatar = avatar, Topic = cleanWish });
        }

        // 2. Thỉnh chuông
        if (lower.Contains("chuông") || lower.Contains("chuong") || lower.Contains("thỉnh chuông"))
        {
            return RingBell(new RingBellParams { User = cleanUser, UniqueId = uniqueId, Avatar = avatar, Count = 1, Wish = cleanWish, ReadTts = true });
        }

        // 3. Gõ mõ
        if (lower.Contains("gõ mõ") || lower.Contains("go mo") || lower.Contains("tụng kinh"))
        {
            return StrikeWoodenFish(new StrikeWoodenFishParams { User = cleanUser, UniqueId = uniqueId, Avatar = avatar, Count = 3 });
        }

        // 4. Thắp hương / Bái phật
        if (lower.Contains("thắp hương") || lower.Contains("thap huong") ||
            lower.Contains("dâng hương") || lower.Contains("dang huong") ||
            lower.Contains("bái phật") || lower.Contains("bai phat") ||
            lower.Contains("lạy phật") || lower.Contains("lay phat"))
        {
            return BurnIncense(new BurnIncenseParams { User = cleanUser, UniqueId = uniqueId, Avatar = avatar, Count = 3, Wish = cleanWish });
        }

        // 5. Cầu nguyện / Hoa đăng
        if (lower.Contains("cầu") || lower.Contains("cau ") ||
            lower.Contains("nguyện") || lower.Contains("nguyen") ||
            lower.Contains("nam mô") || lower.Contains("nam mo") ||
            lower.Contains("mô phật") || lower.Contains("mo phat") ||
            lower.Contains("a di đà") || lower.Contains("a di da") ||
            lower.Contains("bình an") || lower.Contains("tài lộc") ||
            lower.Contains("chúc"))
        {
            return SendPrayer(new SendPrayerParams { User = cleanUser, UniqueId = uniqueId, Avatar = avatar, Wish = cleanWish });
        }

        return BurnIncense(new BurnIncenseParams { User = cleanUser, UniqueId = uniqueId, Avatar = avatar, Count = 1, Wish = cleanWish });
    }

    public void UpdateTikTokState(Action<TikTokState> update)
    {
        lock (_lock)
        {
            update(_state.TikTok);
        }
        Broadcast("temple.state", GetPublicState());
    }
}

