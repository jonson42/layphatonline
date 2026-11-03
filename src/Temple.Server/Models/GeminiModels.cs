using System.Text.Json.Serialization;

namespace Temple.Server.Models;

public class GeminiDivinationResult
{
    public bool Ok { get; set; } = true;
    public string Word { get; set; } = string.Empty;
    public string HexagramTitle { get; set; } = string.Empty;
    public string DivinationExplanation { get; set; } = string.Empty;
    public string ActionAdvice { get; set; } = string.Empty;
    public string TtsReading { get; set; } = string.Empty;
}

public class GeminiCalligraphyDto
{
    [JsonPropertyName("word")]
    public string? Word { get; set; }

    [JsonPropertyName("hexagramTitle")]
    public string? HexagramTitle { get; set; }

    [JsonPropertyName("divinationExplanation")]
    public string? DivinationExplanation { get; set; }

    [JsonPropertyName("actionAdvice")]
    public string? ActionAdvice { get; set; }

    [JsonPropertyName("ttsReading")]
    public string? TtsReading { get; set; }
}
