using System.Collections.Concurrent;
using System.Text;
using System.Text.RegularExpressions;

namespace Temple.Server.Services;

public static class TextSanitizer
{
    // Cuneiform, Braille, Box Drawing, or excessive combining diacritics
    private static readonly Regex WeirdSpamRegex = new(
        @"[\u12000-\u1254F\uFDFD\u2800-\u28FF\u2580-\u259F]|[\u0300-\u036F]{3,}",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex BracketEmoteRegex = new(@"\[[^\]]{1,24}\]", RegexOptions.Compiled);
    private static readonly Regex AllowedViTextRegex = new(
        @"[^\p{L}\p{N}\s.,!?'-]",
        RegexOptions.Compiled);

    private static readonly Regex AllowedViNameRegex = new(
        @"[^\p{L}\p{N}\s._-]",
        RegexOptions.Compiled);

    private static readonly Regex ViLetterRegex = new(
        @"[\p{L}]",
        RegexOptions.Compiled);

    private static readonly Regex BadWordsRegex = new(
        @"(đá dái|địt|lồn|cặc|đm|vcl|vl|yamate|i cư|lừa đảo|lừa à|te-le gram|telegram|bố là trùm)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex MultiPunctRegex = new(@"([.,!?])\1+", RegexOptions.Compiled);
    private static readonly Regex RepeatedCharRegex = new(@"(.)\1{2,}", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex MultiSpaceRegex = new(@"\s+", RegexOptions.Compiled);

    private static readonly ConcurrentDictionary<string, long> CommentCooldowns = new(StringComparer.OrdinalIgnoreCase);

    public static bool IsBlockedSpamOrToxic(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return true;
        if (WeirdSpamRegex.IsMatch(raw)) return true;
        if (BadWordsRegex.IsMatch(raw)) return true;
        return false;
    }

    public static string SanitizeUserName(string? rawName)
    {
        if (string.IsNullOrWhiteSpace(rawName)) return "Thí Chủ Hữu Duyên";

        string normalized = rawName.Normalize(NormalizationForm.FormKC).Normalize(NormalizationForm.FormC);
        normalized = BracketEmoteRegex.Replace(normalized, " ");
        normalized = AllowedViNameRegex.Replace(normalized, " ");
        normalized = RepeatedCharRegex.Replace(normalized, "$1$1");
        normalized = MultiSpaceRegex.Replace(normalized, " ").Trim();

        if (normalized.Length > 26)
        {
            normalized = normalized[..26].Trim();
        }

        if (string.IsNullOrWhiteSpace(normalized) || BadWordsRegex.IsMatch(normalized))
        {
            return "Thí Chủ Hữu Duyên";
        }

        var matchCount = ViLetterRegex.Matches(normalized).Count;
        if (matchCount < 2)
        {
            return "Thí Chủ Hữu Duyên";
        }

        return normalized;
    }

    public static string SanitizeWishText(string? rawWish)
    {
        if (string.IsNullOrWhiteSpace(rawWish)) return string.Empty;

        string cleaned = rawWish.Normalize(NormalizationForm.FormKC).Normalize(NormalizationForm.FormC);
        cleaned = BracketEmoteRegex.Replace(cleaned, " ");
        cleaned = AllowedViTextRegex.Replace(cleaned, " ");
        cleaned = MultiPunctRegex.Replace(cleaned, "$1");
        cleaned = RepeatedCharRegex.Replace(cleaned, "$1$1");
        cleaned = MultiSpaceRegex.Replace(cleaned, " ");
        cleaned = cleaned.Trim(' ', '.', ',', '!', '?', '-');

        if (cleaned.Length > 120)
        {
            cleaned = cleaned[..120].Trim();
        }

        if (string.IsNullOrWhiteSpace(cleaned) || BadWordsRegex.IsMatch(cleaned))
        {
            return string.Empty;
        }

        var matchCount = ViLetterRegex.Matches(cleaned).Count;
        if (matchCount < 2)
        {
            return string.Empty;
        }

        return cleaned;
    }

    public static bool CheckAndRecordCooldown(string userKey, int cooldownMs = 3500)
    {
        if (string.IsNullOrWhiteSpace(userKey)) return true;

        long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (CommentCooldowns.TryGetValue(userKey, out long lastTs))
        {
            if (now - lastTs < cooldownMs)
            {
                return false; // throttled
            }
        }

        CommentCooldowns[userKey] = now;

        if (CommentCooldowns.Count > 1000)
        {
            CommentCooldowns.Clear();
        }

        return true;
    }
}

