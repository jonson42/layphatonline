using Temple.Server.Models;

namespace Temple.Server.Services;

public interface ITtsService
{
    TtsStatus GetStatus();
    Task<TtsResult> SynthesizeAsync(string text, string? voice = null);
    void SetStatusListener(Action<string, object> onBroadcast);
}

