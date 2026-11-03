using System.Text.Json.Serialization;

namespace Temple.Server.Models;

public class TempleState
{
    [JsonPropertyName("totalIncense")]
    public int TotalIncense { get; set; } = 108;

    [JsonPropertyName("totalMerit")]
    public long TotalMerit { get; set; } = 1080;

    [JsonPropertyName("woodenFishHits")]
    public long WoodenFishHits { get; set; } = 360;

    [JsonPropertyName("bellRings")]
    public long BellRings { get; set; } = 36;

    [JsonPropertyName("lanternCount")]
    public int LanternCount { get; set; } = 18;

    [JsonPropertyName("fortuneCount")]
    public int FortuneCount { get; set; } = 12;

    [JsonPropertyName("totalBeerMoney")]
    public long TotalBeerMoney { get; set; } = 0;

    [JsonPropertyName("totalHearts")]
    public long TotalHearts { get; set; } = 0;

    [JsonPropertyName("totalFollows")]
    public long TotalFollows { get; set; } = 0;

    [JsonPropertyName("totalShares")]
    public long TotalShares { get; set; } = 0;

    [JsonPropertyName("totalBirdsReleased")]
    public long TotalBirdsReleased { get; set; } = 2088;

    [JsonPropertyName("totalCalligraphyWords")]
    public long TotalCalligraphyWords { get; set; } = 388;

    [JsonPropertyName("activeIncenseSticks")]
    public int ActiveIncenseSticks { get; set; } = 9;

    [JsonPropertyName("haloIntensity")]
    public double HaloIntensity { get; set; } = 0.45;

    [JsonPropertyName("offerings")]
    public OfferingsState Offerings { get; set; } = new();

    [JsonPropertyName("devotees")]
    public Dictionary<string, Devotee> Devotees { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    [JsonPropertyName("recentEvents")]
    public List<TempleEvent> RecentEvents { get; set; } = new();

    [JsonPropertyName("settings")]
    public TempleSettings Settings { get; set; } = new();

    [JsonPropertyName("tiktok")]
    public TikTokState TikTok { get; set; } = new();
}

public class OfferingsState
{
    [JsonPropertyName("lotus")]
    public int Lotus { get; set; } = 3;

    [JsonPropertyName("fruit")]
    public int Fruit { get; set; } = 2;

    [JsonPropertyName("lamp")]
    public int Lamp { get; set; } = 2;

    [JsonPropertyName("dragon")]
    public int Dragon { get; set; } = 1;
}

public class Devotee
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("uniqueId")]
    public string UniqueId { get; set; } = string.Empty;

    [JsonPropertyName("avatar")]
    public string Avatar { get; set; } = string.Empty;

    [JsonPropertyName("merit")]
    public long Merit { get; set; }

    [JsonPropertyName("incense")]
    public int Incense { get; set; }

    [JsonPropertyName("gifts")]
    public int Gifts { get; set; }

    [JsonPropertyName("birdsReleased")]
    public int BirdsReleased { get; set; } = 0;

    [JsonPropertyName("lastWish")]
    public string LastWish { get; set; } = string.Empty;
}

public class TempleSettings
{
    [JsonPropertyName("ttsEnabled")]
    public bool TtsEnabled { get; set; } = true;

    [JsonPropertyName("ttsVoice")]
    public string TtsVoice { get; set; } = "maichi";

    [JsonPropertyName("bgMusicEnabled")]
    public bool BgMusicEnabled { get; set; } = true;

    [JsonPropertyName("sfxEnabled")]
    public bool SfxEnabled { get; set; } = true;

    [JsonPropertyName("smokeDensity")]
    public double SmokeDensity { get; set; } = 1.0;

    [JsonPropertyName("autoSim")]
    public bool AutoSim { get; set; } = false;

    [JsonPropertyName("autoSimIntervalMs")]
    public int AutoSimIntervalMs { get; set; } = 9500;

    [JsonPropertyName("youtubeUrl")]
    public string? YoutubeUrl { get; set; }

    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "temple";
}

public class TikTokState
{
    [JsonPropertyName("connected")]
    public bool Connected { get; set; } = false;

    [JsonPropertyName("connecting")]
    public bool Connecting { get; set; } = false;

    [JsonPropertyName("username")]
    public string Username { get; set; } = "tranyennhi0987";

    [JsonPropertyName("roomId")]
    public string? RoomId { get; set; }

    [JsonPropertyName("viewerCount")]
    public int ViewerCount { get; set; } = 0;

    [JsonPropertyName("lastError")]
    public string? LastError { get; set; }
}

public class TempleEvent
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("user")]
    public string User { get; set; } = string.Empty;

    [JsonPropertyName("uniqueId")]
    public string UniqueId { get; set; } = string.Empty;

    [JsonPropertyName("avatar")]
    public string Avatar { get; set; } = string.Empty;

    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("merit")]
    public long Merit { get; set; }

    [JsonPropertyName("wish")]
    public string Wish { get; set; } = string.Empty;

    [JsonPropertyName("ttsText")]
    public string TtsText { get; set; } = string.Empty;

    [JsonPropertyName("ttsVoice")]
    public string TtsVoice { get; set; } = "maichi";

    [JsonPropertyName("giftType")]
    public string? GiftType { get; set; }

    [JsonPropertyName("giftName")]
    public string? GiftName { get; set; }

    [JsonPropertyName("coins")]
    public int? Coins { get; set; }

    [JsonPropertyName("topic")]
    public string? Topic { get; set; }

    [JsonPropertyName("calligraphyWord")]
    public string? CalligraphyWord { get; set; }

    [JsonPropertyName("calligraphyMeaning")]
    public string? CalligraphyMeaning { get; set; }

    [JsonPropertyName("actionIntent")]
    public string? ActionIntent { get; set; }

    [JsonPropertyName("hexagramTitle")]
    public string? HexagramTitle { get; set; }

    [JsonPropertyName("actionAdvice")]
    public string? ActionAdvice { get; set; }

    [JsonPropertyName("fortune")]
    public FortuneStick? Fortune { get; set; }
}

public class FortuneStick
{
    [JsonPropertyName("number")]
    public int Number { get; set; }

    [JsonPropertyName("rank")]
    public string Rank { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("poem")]
    public string Poem { get; set; } = string.Empty;

    [JsonPropertyName("meaning")]
    public string Meaning { get; set; } = string.Empty;

    [JsonPropertyName("ttsSummary")]
    public string TtsSummary { get; set; } = string.Empty;
}

public class LeaderboardItem
{
    [JsonPropertyName("rank")]
    public int Rank { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("uniqueId")]
    public string UniqueId { get; set; } = string.Empty;

    [JsonPropertyName("avatar")]
    public string Avatar { get; set; } = string.Empty;

    [JsonPropertyName("merit")]
    public long Merit { get; set; }

    [JsonPropertyName("incense")]
    public int Incense { get; set; }

    [JsonPropertyName("birdsReleased")]
    public int BirdsReleased { get; set; }

    [JsonPropertyName("lastWish")]
    public string LastWish { get; set; } = string.Empty;
}

public class PublicTempleState
{
    [JsonPropertyName("totalIncense")]
    public int TotalIncense { get; set; }

    [JsonPropertyName("totalMerit")]
    public long TotalMerit { get; set; }

    [JsonPropertyName("woodenFishHits")]
    public long WoodenFishHits { get; set; }

    [JsonPropertyName("bellRings")]
    public long BellRings { get; set; }

    [JsonPropertyName("lanternCount")]
    public int LanternCount { get; set; }

    [JsonPropertyName("fortuneCount")]
    public int FortuneCount { get; set; }

    [JsonPropertyName("totalBeerMoney")]
    public long TotalBeerMoney { get; set; }

    [JsonPropertyName("totalHearts")]
    public long TotalHearts { get; set; }

    [JsonPropertyName("totalFollows")]
    public long TotalFollows { get; set; }

    [JsonPropertyName("totalShares")]
    public long TotalShares { get; set; }

    [JsonPropertyName("totalBirdsReleased")]
    public long TotalBirdsReleased { get; set; }

    [JsonPropertyName("totalCalligraphyWords")]
    public long TotalCalligraphyWords { get; set; }

    [JsonPropertyName("activeIncenseSticks")]
    public int ActiveIncenseSticks { get; set; }

    [JsonPropertyName("haloIntensity")]
    public double HaloIntensity { get; set; }

    [JsonPropertyName("offerings")]
    public OfferingsState Offerings { get; set; } = new();

    [JsonPropertyName("leaderboard")]
    public List<LeaderboardItem> Leaderboard { get; set; } = new();

    [JsonPropertyName("recentEvents")]
    public List<TempleEvent> RecentEvents { get; set; } = new();

    [JsonPropertyName("settings")]
    public TempleSettings Settings { get; set; } = new();

    [JsonPropertyName("tiktok")]
    public TikTokState TikTok { get; set; } = new();

    [JsonPropertyName("tts")]
    public TtsStatus Tts { get; set; } = new();
}

public class TtsStatus
{
    [JsonPropertyName("ready")]
    public bool Ready { get; set; } = true;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "ready";

    [JsonPropertyName("engine")]
    public string Engine { get; set; } = "ZeroTTS (zeroweight-ai/ZeroTTS)";

    [JsonPropertyName("voice")]
    public string Voice { get; set; } = "maichi";

    [JsonPropertyName("voices")]
    public List<string> Voices { get; set; } = new() { "maichi" };

    [JsonPropertyName("model")]
    public string Model { get; set; } = "zeroweight-ai/ZeroTTS";
}

public class TtsResult
{
    [JsonPropertyName("ok")]
    public bool Ok { get; set; }

    [JsonPropertyName("cached")]
    public bool Cached { get; set; }

    [JsonPropertyName("voice")]
    public string Voice { get; set; } = "maichi";

    [JsonPropertyName("file")]
    public string? File { get; set; }

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("synthSec")]
    public double SynthSec { get; set; }

    [JsonPropertyName("durationSec")]
    public double DurationSec { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class TempleEventResult
{
    [JsonPropertyName("event")]
    public TempleEvent Event { get; set; } = null!;

    [JsonPropertyName("state")]
    public PublicTempleState State { get; set; } = null!;
}

public class GreetMemberParams
{
    [JsonPropertyName("user")]
    public string User { get; set; } = string.Empty;

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("wish")]
    public string? Wish { get; set; }

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = true;
}

public class ReleaseBirdsParams
{
    [JsonPropertyName("user")]
    public string User { get; set; } = string.Empty;

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("count")]
    public int Count { get; set; } = 50;

    [JsonPropertyName("wish")]
    public string? Wish { get; set; }

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = true;
}


