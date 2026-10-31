using Temple.Server.Models;

namespace Temple.Server.Services;

public interface ITikTokService
{
    Task<TikTokState> ConnectAsync(string usernameOrUrl);
    Task<TikTokState> DisconnectAsync();
}

