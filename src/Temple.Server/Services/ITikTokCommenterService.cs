using Temple.Server.Models;

namespace Temple.Server.Services;

public interface ITikTokCommenterService
{
    TikTokCommenterState GetState();
    Task<TikTokCommenterState> StartAsync(string? username = null, bool headless = false);
    Task<TikTokCommenterState> StopAsync();
    Task<TikTokCommenterState> OpenLoginAsync();
    Task<bool> SendCommentAsync(string text);
    Task<bool> SendRandomTimeGreetingAsync(string? username = null);
}

