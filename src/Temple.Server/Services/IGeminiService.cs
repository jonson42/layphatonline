using Temple.Server.Models;

namespace Temple.Server.Services;

public interface IGeminiService
{
    Task<GeminiDivinationResult> DivineCalligraphyAsync(string user, string deedOrIntent, string? requestedWord);
}
