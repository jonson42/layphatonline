using System.Text.Json.Serialization;

namespace Temple.Server.Models;

public class TikTokCommenterState
{
    [JsonPropertyName("running")]
    public bool Running { get; set; } = false;

    [JsonPropertyName("loggedIn")]
    public bool LoggedIn { get; set; } = false;

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("lastComment")]
    public string? LastComment { get; set; }

    [JsonPropertyName("lastCommentTime")]
    public string? LastCommentTime { get; set; }

    [JsonPropertyName("statusMessage")]
    public string StatusMessage { get; set; } = "Chưa khởi chạy trình duyệt Playwright";

    [JsonPropertyName("lastError")]
    public string? LastError { get; set; }
}

public class SendCommentParams
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public class StartCommenterParams
{
    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("headless")]
    public bool? Headless { get; set; }
}

