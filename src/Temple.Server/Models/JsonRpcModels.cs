using System.Text.Json;
using System.Text.Json.Serialization;

namespace Temple.Server.Models;

public class JsonRpcRequest
{
    [JsonPropertyName("jsonrpc")]
    public string JsonRpc { get; set; } = "2.0";

    [JsonPropertyName("id")]
    public object? Id { get; set; }

    [JsonPropertyName("method")]
    public string Method { get; set; } = string.Empty;

    [JsonPropertyName("params")]
    public JsonElement? Params { get; set; }
}

public class JsonRpcResponse
{
    [JsonPropertyName("jsonrpc")]
    public string JsonRpc { get; set; } = "2.0";

    [JsonPropertyName("id")]
    public object? Id { get; set; }

    [JsonPropertyName("result")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Result { get; set; }

    [JsonPropertyName("error")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public JsonRpcError? Error { get; set; }
}

public class JsonRpcNotification
{
    [JsonPropertyName("jsonrpc")]
    public string JsonRpc { get; set; } = "2.0";

    [JsonPropertyName("method")]
    public string Method { get; set; } = string.Empty;

    [JsonPropertyName("params")]
    public object? Params { get; set; }
}

public class JsonRpcError
{
    [JsonPropertyName("code")]
    public int Code { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("data")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Data { get; set; }

    public static JsonRpcError ParseError(string msg = "Parse error") => new() { Code = -32700, Message = msg };
    public static JsonRpcError InvalidRequest(string msg = "Invalid Request") => new() { Code = -32600, Message = msg };
    public static JsonRpcError MethodNotFound(string msg = "Method not found") => new() { Code = -32601, Message = msg };
    public static JsonRpcError InvalidParams(string msg = "Invalid params") => new() { Code = -32602, Message = msg };
    public static JsonRpcError InternalError(string msg = "Internal error") => new() { Code = -32603, Message = msg };
    public static JsonRpcError ServerError(string msg) => new() { Code = -32000, Message = msg };
}

public class BurnIncenseParams
{
    [JsonPropertyName("user")]
    public string? User { get; set; }

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("count")]
    public int Count { get; set; } = 3;

    [JsonPropertyName("wish")]
    public string? Wish { get; set; }

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = true;

    [JsonPropertyName("customTts")]
    public string? CustomTts { get; set; }
}

public class StrikeWoodenFishParams
{
    [JsonPropertyName("user")]
    public string? User { get; set; }

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("count")]
    public int Count { get; set; } = 1;

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = true;

    [JsonPropertyName("ttsText")]
    public string? TtsText { get; set; }
}

public class RingBellParams
{
    [JsonPropertyName("user")]
    public string? User { get; set; }

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("count")]
    public int Count { get; set; } = 1;

    [JsonPropertyName("wish")]
    public string? Wish { get; set; }

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = false;
}

public class SendPrayerParams
{
    [JsonPropertyName("user")]
    public string? User { get; set; }

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("wish")]
    public string? Wish { get; set; }

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = true;

    [JsonPropertyName("customTts")]
    public string? CustomTts { get; set; }
}

public class OfferGiftParams
{
    [JsonPropertyName("user")]
    public string? User { get; set; }

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("coins")]
    public int Coins { get; set; } = 10;

    [JsonPropertyName("giftType")]
    public string? GiftType { get; set; }

    [JsonPropertyName("giftName")]
    public string? GiftName { get; set; }

    [JsonPropertyName("wish")]
    public string? Wish { get; set; }

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = true;

    [JsonPropertyName("customTts")]
    public string? CustomTts { get; set; }
}

public class DrawFortuneParams
{
    [JsonPropertyName("user")]
    public string? User { get; set; }

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("topic")]
    public string? Topic { get; set; }

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = true;

    [JsonPropertyName("customTts")]
    public string? CustomTts { get; set; }
}

public class CommentParams
{
    [JsonPropertyName("comment")]
    public string? Comment { get; set; }

    [JsonPropertyName("user")]
    public string? User { get; set; }

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }
}

public class SpeakParams
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("voice")]
    public string? Voice { get; set; }

    [JsonPropertyName("broadcast")]
    public bool? Broadcast { get; set; } = true;
}

public class ConnectLiveParams
{
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;
}

public class SetAutoSimParams
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; }
}

public class FollowChannelParams
{
    [JsonPropertyName("user")]
    public string? User { get; set; }

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = true;

    [JsonPropertyName("customTts")]
    public string? CustomTts { get; set; }
}

public class ShareStreamParams
{
    [JsonPropertyName("user")]
    public string? User { get; set; }

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = true;

    [JsonPropertyName("customTts")]
    public string? CustomTts { get; set; }
}

public class RequestCalligraphyParams
{
    [JsonPropertyName("user")]
    public string? User { get; set; }

    [JsonPropertyName("uniqueId")]
    public string? UniqueId { get; set; }

    [JsonPropertyName("avatar")]
    public string? Avatar { get; set; }

    [JsonPropertyName("word")]
    public string? Word { get; set; }

    [JsonPropertyName("intent")]
    public string? Intent { get; set; }

    [JsonPropertyName("wish")]
    public string? Wish { get; set; }

    [JsonPropertyName("readTts")]
    public bool? ReadTts { get; set; } = true;

    [JsonPropertyName("customTts")]
    public string? CustomTts { get; set; }
}

