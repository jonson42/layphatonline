using System.Text.Json;
using Temple.Server.Models;

namespace Temple.Server.Services;

public interface ITempleService
{
    PublicTempleState GetPublicState();
    TempleEventResult BurnIncense(BurnIncenseParams p);
    TempleEventResult StrikeWoodenFish(StrikeWoodenFishParams p);
    TempleEventResult RingBell(RingBellParams p);
    TempleEventResult SendPrayer(SendPrayerParams p);
    TempleEventResult OfferGift(OfferGiftParams p);
    TempleEventResult DrawFortune(DrawFortuneParams p);
    TempleEventResult GrandCeremony(OfferGiftParams p);
    TempleEventResult FollowChannel(FollowChannelParams p);
    TempleEventResult ShareStream(ShareStreamParams p);
    TempleEventResult GreetMember(GreetMemberParams p);
    TempleEventResult ReleaseBirds(ReleaseBirdsParams p);
    PublicTempleState UpdateSettings(JsonElement p);
    PublicTempleState ResetMerit();
    object? HandleComment(string? comment, string? user, string? uniqueId, string? avatar);
    void UpdateTikTokState(Action<TikTokState> update);
    void SetBroadcaster(Action<string, object> broadcaster);
    void Broadcast(string method, object payload);
    Task SaveStateAsync();
}

