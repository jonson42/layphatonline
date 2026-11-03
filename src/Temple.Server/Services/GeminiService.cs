using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Temple.Server.Models;

namespace Temple.Server.Services;

public class GeminiService : IGeminiService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<GeminiService> _logger;

    private const string PrimaryModel = "gemini-3.5-flash-lite";

    public GeminiService(HttpClient http, IConfiguration config, ILogger<GeminiService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
        _http.Timeout = TimeSpan.FromSeconds(8);
    }

    private string GetApiKey()
    {
        string? envKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        if (!string.IsNullOrWhiteSpace(envKey)) return envKey.Trim();

        string? configKey = _config["Gemini:ApiKey"];
        if (!string.IsNullOrWhiteSpace(configKey)) return configKey.Trim();

        // Check local data/gemini_key.txt
        string keyFile = Path.Combine(AppContext.BaseDirectory, "data", "gemini_key.txt");
        if (!File.Exists(keyFile))
        {
            keyFile = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "data", "gemini_key.txt"));
        }
        if (File.Exists(keyFile))
        {
            try
            {
                string fileContent = File.ReadAllText(keyFile).Trim();
                if (!string.IsNullOrWhiteSpace(fileContent)) return fileContent;
            }
            catch {}
        }

        try
        {
            var b64 = "QVEuQWI4Uk42TFkyeGpwdHlJaUFvTTBHaURjd1VlNmFzbm1Dc1VzaW1mX2NjVmpuTXZpWUE=";
            return System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(b64));
        }
        catch
        {
            return string.Empty;
        }
    }

    public async Task<GeminiDivinationResult> DivineCalligraphyAsync(string user, string deedOrIntent, string? requestedWord)
    {
        string cleanUser = string.IsNullOrWhiteSpace(user) ? "Thí Chủ" : user.Trim();
        string cleanIntent = string.IsNullOrWhiteSpace(deedOrIntent) ? "Cầu bình an, tài lộc và mọi sự hanh thông" : deedOrIntent.Trim();
        string cleanWord = (requestedWord ?? string.Empty).Trim().ToUpperInvariant();

        try
        {
            string apiKey = GetApiKey();
            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{PrimaryModel}:generateContent?key={apiKey}";

            string prompt = $@"
Bạn là Bậc Thầy Bói Toán, Chiêm Tinh & Thư Pháp cổ truyền thông tuệ (Thầy Bói Xem Quẻ & Đoán Chữ Giải Hạn trên phiên live stream).
Thí chủ đến nhờ Thầy bói quẻ và xin chữ:
- Tên thí chủ: ""{cleanUser}""
- Việc muốn làm / Dự định / Tâm sự: ""{cleanIntent}""
- Chữ muốn xin: ""{(string.IsNullOrWhiteSpace(cleanWord) ? "(Để Thầy Bói tự gieo chữ linh ứng phù hợp nhất)" : cleanWord)}""

Nhiệm vụ của bạn:
1. Xác định chữ thư pháp đại tự linh ứng (1-2 từ tiếng Việt in hoa, ví dụ: TÀI, LỘC, THUẬN, ĐỖ, AN, PHÚC, TÂM, DUYÊN, PHÁT, THÀNH, NHẪN...). Nếu thí chủ đã chỉ định chữ, hãy dùng chữ đó.
2. Đặt một tên quẻ đại cát phù hợp (ví dụ: 'Quẻ Thượng Cát • Khai Lộc Tiến Bảo', 'Quẻ Đại Cát • Thuận Buồm Xuôi Gió'...).
3. Luận giải ý nghĩa thâm thúy: Vì sao chữ này gắn liền với việc thí chủ định làm, thời cơ và cách đón lành tránh dữ (2-3 câu ngắn gọn, ấm áp, sâu sắc, tạo niềm tin).
4. Kế sách hành động: Việc nên làm và điều cần tránh (1-2 câu).
5. Lời phán cô đọng để đọc to bằng giọng AI (khoảng 35-45 từ, mở đầu bằng: 'Thầy bói phán cho thí chủ {cleanUser}: Với việc {cleanIntent}, thầy khai bút cho chữ [chữ]...').

Trả về DUY NHẤT một chuỗi JSON thuần túy (không markdown bao quanh):
{{
  ""word"": ""CHỮ_IN_HOA"",
  ""hexagramTitle"": ""Tên quẻ đại cát"",
  ""divinationExplanation"": ""Lời lý giải chi tiết của Thầy Bói"",
  ""actionAdvice"": ""Việc nên làm và cần tránh"",
  ""ttsReading"": ""Lời phán ngắn gọn để đọc thành tiếng trên live""
}}";

            var reqBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.75,
                    responseMimeType = "application/json"
                }
            };

            var res = await _http.PostAsJsonAsync(url, reqBody);
            if (res.IsSuccessStatusCode)
            {
                var jsonDoc = await res.Content.ReadFromJsonAsync<JsonDocument>();
                string? rawText = jsonDoc?.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                if (!string.IsNullOrWhiteSpace(rawText))
                {
                    string cleanedJson = CleanJsonString(rawText);
                    var parsed = JsonSerializer.Deserialize<GeminiCalligraphyDto>(cleanedJson);
                    if (parsed != null && !string.IsNullOrWhiteSpace(parsed.Word))
                    {
                        return new GeminiDivinationResult
                        {
                            Ok = true,
                            Word = parsed.Word.Trim().ToUpperInvariant(),
                            HexagramTitle = parsed.HexagramTitle ?? "Quẻ Thượng Cát • Vạn Sự Hanh Thông",
                            DivinationExplanation = parsed.DivinationExplanation ?? "Chữ đại cát trợ duyên mưu sự tất thành.",
                            ActionAdvice = parsed.ActionAdvice ?? "Giữ tâm sáng, hành sự chu đáo ắt gặp quý nhân.",
                            TtsReading = parsed.TtsReading ?? $"Thầy bói phán cho thí chủ {cleanUser}: Với việc {cleanIntent}, thầy khai bút cho chữ {parsed.Word}!"
                        };
                    }
                }
            }
            else
            {
                _logger.LogWarning("Gemini API returned status {Status}: {Reason}", res.StatusCode, await res.Content.ReadAsStringAsync());
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini Divination error. Falling back to local oracle.");
        }

        // Graceful Local Fallback
        return FallbackDivination(cleanUser, cleanIntent, cleanWord);
    }

    private static string CleanJsonString(string text)
    {
        string t = text.Trim();
        if (t.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            t = t.Substring(7);
        }
        else if (t.StartsWith("```"))
        {
            t = t.Substring(3);
        }

        if (t.EndsWith("```"))
        {
            t = t.Substring(0, t.Length - 3);
        }
        return t.Trim();
    }

    private static GeminiDivinationResult FallbackDivination(string user, string intent, string? word)
    {
        string lower = intent.ToLowerInvariant();
        string chosenWord = !string.IsNullOrWhiteSpace(word) ? word : "AN";
        string hexTitle = "Quẻ Thượng Cát • Vạn Sự Cát Tường";
        string meaning = "";
        string advice = "";

        if (lower.Contains("buôn") || lower.Contains("bán") || lower.Contains("mở quán") || lower.Contains("cửa hàng") || lower.Contains("kinh doanh") || lower.Contains("tiền"))
        {
            chosenWord = !string.IsNullOrWhiteSpace(word) ? word : "TÀI";
            hexTitle = "Quẻ Thượng Cát • Khai Lộc Tiến Bảo";
            meaning = $"Chữ {chosenWord} khai bút cho dự định {intent} mang ý nghĩa tụ khí sinh tài. Buôn may bán đắt, chữ Tâm đi liền chữ Tài ắt đông khách mến chuộng.";
            advice = "Nên chọn giờ hoàng đạo xuất hành, đón khách bằng nụ cười chân thành; tránh vội vàng trong tuần đầu.";
        }
        else if (lower.Contains("thi") || lower.Contains("học") || lower.Contains("tốt nghiệp") || lower.Contains("đại học") || lower.Contains("bằng"))
        {
            chosenWord = !string.IsNullOrWhiteSpace(word) ? word : "ĐỖ";
            hexTitle = "Quẻ Đại Cát • Bảng Vàng Đề Tên";
            meaning = $"Chữ {chosenWord} ứng nghiệm cho việc {intent}. Văn chương sáng tỏ, công thành danh toại, trí tuệ mẫn tiệp sẽ giúp vượt qua kỳ thi xuất sắc.";
            advice = "Nên giữ tâm thế tự tin, ngủ đủ giấc trước giờ thi; tránh phân tâm và lo lắng thái quá.";
        }
        else if (lower.Contains("yêu") || lower.Contains("cưới") || lower.Contains("hôn") || lower.Contains("crush") || lower.Contains("tỏ tình"))
        {
            chosenWord = !string.IsNullOrWhiteSpace(word) ? word : "DUYÊN";
            hexTitle = "Quẻ Cát Tường • Hữu Duyên Tương Ngộ";
            meaning = $"Chữ {chosenWord} kết duyên lành cho việc {intent}. Đào hoa nở rộ, lòng thành cảm động đối phương, mở ra hạnh phúc bền lâu.";
            advice = "Nên bày tỏ chân thành, lắng nghe thấu hiểu; tránh áp đặt và nóng vội.";
        }
        else if (lower.Contains("đi xa") || lower.Contains("xuất ngoại") || lower.Contains("nước ngoài") || lower.Contains("chuyến") || lower.Contains("xe"))
        {
            chosenWord = !string.IsNullOrWhiteSpace(word) ? word : "THUẬN";
            hexTitle = "Quẻ Cát Tường • Thuận Buồm Xuôi Gió";
            meaning = $"Chữ {chosenWord} trợ lực cho việc {intent}. Đi một ngày đàng học một sàng khôn, bốn phương quý nhân đưa đường chỉ lối.";
            advice = "Nên kiểm tra giấy tờ chu đáo trước khi khởi hành; tâm an vạn sự an.";
        }
        else
        {
            chosenWord = !string.IsNullOrWhiteSpace(word) ? word : "PHÚC";
            hexTitle = "Quẻ Thượng Cát • Phúc Khí Viên Mãn";
            meaning = $"Chữ {chosenWord} soi chiếu cho tâm nguyện {intent}. Phúc đức sâu dày, vạn sự hanh thông, mọi trắc trở đều hóa thành thuận lợi.";
            advice = "Nên tích nhiều việc thiện lành, giữ tinh thần lạc quan yêu đời.";
        }

        string tts = $"Thầy bói phán cho thí chủ {user}: Với việc {intent}, thầy khai bút cho chữ {chosenWord}. {hexTitle}, cầu chúc mưu sự tất thành, vạn sự cát tường!";

        return new GeminiDivinationResult
        {
            Ok = true,
            Word = chosenWord,
            HexagramTitle = hexTitle,
            DivinationExplanation = meaning,
            ActionAdvice = advice,
            TtsReading = tts
        };
    }
}
