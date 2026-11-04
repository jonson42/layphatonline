using System.Text.Json;
using Temple.Server.Models;

namespace Temple.Server.Services;

public class RpcDispatcher
{
    private readonly ITempleService _templeService;
    private readonly ITtsService _ttsService;
    private readonly ITikTokService _tikTokService;
    private readonly ITikTokCommenterService _commenterService;
    private readonly ILogger<RpcDispatcher> _logger;

    public RpcDispatcher(
        ITempleService templeService,
        ITtsService ttsService,
        ITikTokService tikTokService,
        ITikTokCommenterService commenterService,
        ILogger<RpcDispatcher> logger)
    {
        _templeService = templeService;
        _ttsService = ttsService;
        _tikTokService = tikTokService;
        _commenterService = commenterService;
        _logger = logger;
    }

    public async Task<object?> DispatchAsync(string method, JsonElement? parameters)
    {
        switch (method)
        {
            case "temple.getState":
                return _templeService.GetPublicState();

            case "temple.burnIncense":
                var pBurn = DeserializeParams<BurnIncenseParams>(parameters);
                return _templeService.BurnIncense(pBurn ?? new BurnIncenseParams());

            case "temple.strikeWoodenFish":
                var pFish = DeserializeParams<StrikeWoodenFishParams>(parameters);
                return _templeService.StrikeWoodenFish(pFish ?? new StrikeWoodenFishParams());

            case "temple.ringBell":
                var pBell = DeserializeParams<RingBellParams>(parameters);
                return _templeService.RingBell(pBell ?? new RingBellParams());

            case "temple.sendPrayer":
                var pPrayer = DeserializeParams<SendPrayerParams>(parameters);
                return _templeService.SendPrayer(pPrayer ?? new SendPrayerParams());

            case "temple.offerGift":
                var pGift = DeserializeParams<OfferGiftParams>(parameters);
                return _templeService.OfferGift(pGift ?? new OfferGiftParams());

            case "temple.drawFortune":
                var pFortune = DeserializeParams<DrawFortuneParams>(parameters);
                return _templeService.DrawFortune(pFortune ?? new DrawFortuneParams());

            case "temple.grandCeremony":
                var pCeremony = DeserializeParams<OfferGiftParams>(parameters);
                return _templeService.GrandCeremony(pCeremony ?? new OfferGiftParams());

            case "temple.follow":
                var pFollow = DeserializeParams<FollowChannelParams>(parameters);
                return _templeService.FollowChannel(pFollow ?? new FollowChannelParams());

            case "temple.share":
                var pShare = DeserializeParams<ShareStreamParams>(parameters);
                return _templeService.ShareStream(pShare ?? new ShareStreamParams());

            case "temple.greetMember":
                var pGreet = DeserializeParams<GreetMemberParams>(parameters);
                return _templeService.GreetMember(pGreet ?? new GreetMemberParams());

            case "temple.releaseBirds":
                var pBirds = DeserializeParams<ReleaseBirdsParams>(parameters);
                return _templeService.ReleaseBirds(pBirds ?? new ReleaseBirdsParams());

            case "temple.requestCalligraphy":
            case "temple.divineCalligraphy":
                var pCalligraphy = DeserializeParams<RequestCalligraphyParams>(parameters);
                return await _templeService.RequestCalligraphyAsync(pCalligraphy ?? new RequestCalligraphyParams());

            case "temple.updateSettings":
                if (parameters.HasValue)
                {
                    return _templeService.UpdateSettings(parameters.Value);
                }
                return _templeService.GetPublicState();

            case "temple.resetMerit":
                return _templeService.ResetMerit();

            case "temple.comment":
                var pComment = DeserializeParams<CommentParams>(parameters);
                if (pComment != null)
                {
                    return _templeService.HandleComment(pComment.Comment, pComment.User, pComment.UniqueId, pComment.Avatar);
                }
                return null;

            case "temple.speak":
                var pSpeak = DeserializeParams<SpeakParams>(parameters);
                if (pSpeak != null && !string.IsNullOrWhiteSpace(pSpeak.Text))
                {
                    var res = await _ttsService.SynthesizeAsync(pSpeak.Text, pSpeak.Voice);
                    if (res.Ok && pSpeak.Broadcast != false)
                    {
                        _templeService.Broadcast("tts.play", new
                        {
                            text = pSpeak.Text,
                            voice = res.Voice,
                            url = res.Url
                        });
                    }
                    return res;
                }
                return new TtsResult { Ok = false, Error = "Missing text" };

            case "temple.ttsStatus":
                return _ttsService.GetStatus();

            case "live.connect":
                var pConn = DeserializeParams<ConnectLiveParams>(parameters);
                if (pConn != null && !string.IsNullOrWhiteSpace(pConn.Username))
                {
                    return await _tikTokService.ConnectAsync(pConn.Username);
                }
                throw new ArgumentException("Thiếu tham số username");

            case "live.disconnect":
                return await _tikTokService.DisconnectAsync();

            case "live.setAutoSim":
                var pSim = DeserializeParams<SetAutoSimParams>(parameters);
                bool enabled = pSim?.Enabled ?? false;
                var doc = JsonDocument.Parse($"{{\"autoSim\": {(enabled ? "true" : "false")}}}");
                return _templeService.UpdateSettings(doc.RootElement);

            case "live.startCommenter":
                var pStartCom = DeserializeParams<StartCommenterParams>(parameters);
                return await _commenterService.StartAsync(pStartCom?.Username, pStartCom?.Headless ?? false);

            case "live.stopCommenter":
                return await _commenterService.StopAsync();

            case "live.openLogin":
                return await _commenterService.OpenLoginAsync();

            case "live.sendComment":
                var pSendCom = DeserializeParams<SendCommentParams>(parameters);
                bool okCom = await _commenterService.SendCommentAsync(pSendCom?.Text ?? "");
                return new { success = okCom, text = pSendCom?.Text, state = _commenterService.GetState() };

            case "live.sendGreeting":
                var pGreetCom = DeserializeParams<SendCommentParams>(parameters);
                bool okGreet = await _commenterService.SendRandomTimeGreetingAsync(pGreetCom?.Text);
                return new { success = okGreet, state = _commenterService.GetState() };

            case "live.getCommenterStatus":
                return _commenterService.GetState();

            case "live.getChatSample":
                return new
                {
                    timeOfDay = LiveChatGenerator.GetTimeOfDayGreeting(),
                    randomMessage = LiveChatGenerator.GetRandomChatMessage(),
                    memberGreeting = LiveChatGenerator.GetMemberGreeting("Thí Chủ Hữu Duyên")
                };

            default:
                throw new InvalidOperationException($"Không tìm thấy phương thức JSON-RPC: {method}");
        }
    }

    private static T? DeserializeParams<T>(JsonElement? element) where T : class
    {
        if (!element.HasValue) return null;
        try
        {
            return JsonSerializer.Deserialize<T>(element.Value.GetRawText());
        }
        catch
        {
            return null;
        }
    }
}

