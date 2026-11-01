using System.Text.Json;
using Temple.Server.Models;

namespace Temple.Server.Services;

public class TempleService : ITempleService
{
    private readonly ILogger<TempleService> _logger;
    private readonly ITtsService _ttsService;
    private readonly string _stateFilePath;
    private readonly object _lock = new();

    private TempleState _state = new();
    private Action<string, object>? _broadcaster;
    private CancellationTokenSource? _saveDebounceCts;

    public TempleService(ILogger<TempleService> logger, ITtsService ttsService, IHostEnvironment env)
    {
        _logger = logger;
        _ttsService = ttsService;

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

    private Devotee RecordDevotee(string? user, string? uniqueId, string? avatar, long meritDelta, int incenseDelta = 0, int giftDelta = 0, string wish = "")
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
                LastWish = string.Empty
            };
            _state.Devotees[key] = dev;
        }

        dev.Name = displayName;
        if (!string.IsNullOrEmpty(avatar)) dev.Avatar = avatar;
        dev.Merit += meritDelta;
        dev.Incense += incenseDelta;
        dev.Gifts += giftDelta;
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
                .OrderByDescending(d => d.Merit)
                .Take(limit)
                .Select((d, idx) => new LeaderboardItem
                {
                    Rank = idx + 1,
                    Name = d.Name,
                    UniqueId = d.UniqueId,
                    Avatar = d.Avatar,
                    Merit = d.Merit,
                    Incense = d.Incense,
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
            var dev = RecordDevotee(user, uniqueId, avatar, merit, count, 0, wish);

            string ttsText;
            if (p.ReadTts == false)
            {
                ttsText = string.Empty;
            }
            else if (!string.IsNullOrEmpty(p.CustomTts))
            {
                ttsText = p.CustomTts;
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
                Type = "burnIncense",
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
        lock (_lock)
        {
            string user = TextSanitizer.SanitizeUserName(p.User);
            string uniqueId = p.UniqueId ?? string.Empty;
            string avatar = p.Avatar ?? string.Empty;
            int count = Math.Clamp(p.Count <= 0 ? 1 : p.Count, 1, 50);
            int merit = count;

            _state.WoodenFishHits += count;
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 0, 0);

            var evt = PushEvent(new TempleEvent
            {
                Type = "strikeWoodenFish",
                User = dev.Name,
                UniqueId = dev.UniqueId,
                Avatar = dev.Avatar,
                Count = count,
                Merit = merit,
                TtsText = p.TtsText ?? string.Empty
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
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 0, 0, wish);

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
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 1, 0, wish);

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

    public TempleEventResult OfferGift(OfferGiftParams p)
    {
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
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 3, 1, wish);

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
            var dev = RecordDevotee(user, uniqueId, avatar, merit, 0, 0, $"Xin xăm: Quẻ số {fortune.Number} ({fortune.Rank})");

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

