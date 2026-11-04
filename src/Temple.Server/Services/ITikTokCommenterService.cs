using Temple.Server.Models;

namespace Temple.Server.Services;

public interface ITikTokCommenterService
{
    TikTokCommenterState GetState();
    Task<TikTokCommenterState> StartAsync(string? username = null, bool headless = false);
    Task<TikTokCommenterState> StopAsync();
    Task<TikTokCommenterState> OpenLoginAsync();
    Task<TikTokCommenterState> SetCookieAsync(string cookie);
    Task<bool> OpenSystemBrowserLoginAsync();
    Task<bool> SendCommentAsync(string text, bool ignoreCooldown = false);
    Task<bool> SendRandomTimeGreetingAsync(string? username = null, bool ignoreCooldown = false);
}
