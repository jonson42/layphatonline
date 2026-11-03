using Temple.Server.Models;

namespace Temple.Server.Services;

public class SimulationService : BackgroundService
{
    private readonly ILogger<SimulationService> _logger;
    private readonly ITempleService _templeService;
    private readonly Random _rnd = new();

    private static readonly (string User, string UniqueId, string Wish)[] SimDevotees =
    {
        ("Ngọc Anh Nguyễn", "ngocanh.98", "Con thành tâm cầu cho bố mẹ luôn mạnh khỏe, bình an"),
        ("Trần Minh Quân", "minhquan_bds", "Cầu tháng mới công việc thuận buồm xuôi gió, tài lộc hanh thông"),
        ("Diệu Thảo Tâm An", "tam_an_99", "Nam Mô A Di Đà Phật, nguyện cầu thế giới hòa bình chúng sinh an lạc"),
        ("Lê Hoàng Nam", "hoangnam.dev", "Cầu thi cử đỗ đạt điểm cao, sự nghiệp rộng mở"),
        ("Phạm Thanh Hà", "thanhha.lotus", "Cầu gia đạo êm ấm, con cái ngoan ngoãn học giỏi"),
        ("Vũ Đức Thịnh", "ducthinh88", "Con xin gieo một quẻ cầu tài lộc đầu năm")
    };

    private static readonly string[] AuspiciousWishes =
    {
        "Cầu cho gia đạo bình an, phúc lộc dồi dào, vạn sự cát tường",
        "Cầu sức khỏe dồi dào, tâm an trí sáng, gia đình êm ấm",
        "Cầu công danh sự nghiệp thuận buồm xuôi gió, hanh thông tấn tới",
        "Cầu tài lộc hanh thông, tai qua nạn khỏi, sở nguyện tòng tâm",
        "Cầu chư Phật gia hộ cho thí chủ thân tâm an lạc, vạn điều may mắn",
        "Cầu bách bệnh tiêu trừ, phước thọ tăng long, vạn sự như ý"
    };

    public SimulationService(ILogger<SimulationService> logger, ITempleService templeService)
    {
        _logger = logger;
        _templeService = templeService;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var state = _templeService.GetPublicState();
                if (state.Settings.AutoSim)
                {
                    RunSingleStep();
                }

                int interval = Math.Max(2000, state.Settings.AutoSimIntervalMs);
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[AutoSim] Lỗi bước giả lập");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }

    private void RunSingleStep()
    {
        var state = _templeService.GetPublicState();
        var pick = SimDevotees[_rnd.Next(SimDevotees.Length)];
        double roll = _rnd.NextDouble();

        if (state.Settings.Mode == "phongsinh")
        {
            if (roll < 0.30)
            {
                // 1. Giả lập người xem vào phòng live phóng sinh chim -> Chào mừng và chúc phúc
                _templeService.GreetMember(new GreetMemberParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    ReadTts = true
                });
            }
            else if (roll < 0.55)
            {
                // 2. Giả lập ủng hộ phóng sinh chim (20 - 200 chú chim)
                int[] birdPicks = { 20, 50, 100, 200 };
                int birds = birdPicks[_rnd.Next(birdPicks.Length)];
                _templeService.ReleaseBirds(new ReleaseBirdsParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    Count = birds,
                    ReadTts = true
                });
            }
            else if (roll < 0.72)
            {
                // 3. Giả lập thả tim trợ duyên
                _templeService.StrikeWoodenFish(new StrikeWoodenFishParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    Count = _rnd.Next(5, 20),
                    ReadTts = true
                });
            }
            else if (roll < 0.88)
            {
                // 4. Giả lập Follow kênh
                _templeService.FollowChannel(new FollowChannelParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    ReadTts = true
                });
            }
            else
            {
                // 5. Giả lập Chia sẻ live
                _templeService.ShareStream(new ShareStreamParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    ReadTts = true
                });
            }
            return;
        }

        if (state.Settings.Mode == "bothi")
        {
            if (roll < 0.30)
            {
                // 1. Giả lập người vào live chế độ Bố Thí
                _templeService.GreetMember(new GreetMemberParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    ReadTts = true
                });
            }
            else if (roll < 0.55)
            {
                // 2. Giả lập bố thí tiền / xu
                int[] coinPicks = { 5, 10, 20, 50, 100 };
                int coins = coinPicks[_rnd.Next(coinPicks.Length)];
                _templeService.OfferGift(new OfferGiftParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    Coins = coins,
                    GiftName = $"{coins} Đồng Tiền Lẻ",
                    Wish = $"Bố thí {coins} đồng để em đi uống bia 🍺",
                    ReadTts = true
                });
            }
            else if (roll < 0.72)
            {
                // 3. Giả lập thả tim
                _templeService.StrikeWoodenFish(new StrikeWoodenFishParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    Count = _rnd.Next(5, 20),
                    ReadTts = true
                });
            }
            else if (roll < 0.88)
            {
                // 4. Giả lập Follow kênh
                _templeService.FollowChannel(new FollowChannelParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    ReadTts = true
                });
            }
            else
            {
                // 5. Giả lập Chia sẻ live (Share)
                _templeService.ShareStream(new ShareStreamParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    ReadTts = true
                });
            }
            return;
        }

        if (state.Settings.Mode == "xinchu")
        {
            if (roll < 0.25)
            {
                // 1. Giả lập người vào xem gian hàng Xin Chữ
                _templeService.GreetMember(new GreetMemberParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    ReadTts = true
                });
            }
            else if (roll < 0.50)
            {
                // 2. Giả lập tặng quà / gieo duyên nhận chữ thư pháp
                int[] coinPicks = { 5, 10, 20, 50, 100 };
                int coins = coinPicks[_rnd.Next(coinPicks.Length)];
                _templeService.OfferGift(new OfferGiftParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    Coins = coins,
                    GiftName = $"{coins} Đồng Gieo Duyên",
                    Wish = "Cầu bình an tài lộc may mắn 🌸",
                    ReadTts = true
                });
            }
            else if (roll < 0.70)
            {
                // 3. Giả lập Thầy Bói đoán quẻ & cho chữ (Gemini AI)
                string[] sampleIntents = {
                    "Khai trương mở quán buôn bán",
                    "Thi đỗ đại học điểm cao",
                    "Tỏ tình người yêu mến",
                    "Xuất ngoại đi làm xa",
                    "Cầu bình an mạnh khỏe cho gia đình",
                    "Đổi công việc mới thăng tiến"
                };
                string pickedIntent = sampleIntents[_rnd.Next(sampleIntents.Length)];
                string[] words = { "PHÚC", "LỘC", "THỌ", "AN", "TÂM", "TÀI", "NHẪN", "ĐỨC", "CÁT TƯỜNG", "DUYÊN", "ĐỖ ĐẠT", "PHÁT TÀI" };
                string pickedWord = words[_rnd.Next(words.Length)];
                _templeService.RequestCalligraphy(new RequestCalligraphyParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    Intent = pickedIntent,
                    Word = pickedWord,
                    ReadTts = true
                });
            }
            else if (roll < 0.85)
            {
                // 4. Giả lập thả tim trợ duyên
                _templeService.StrikeWoodenFish(new StrikeWoodenFishParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    Count = _rnd.Next(5, 25),
                    ReadTts = true
                });
            }
            else if (roll < 0.93)
            {
                // 5. Giả lập bấm Follow
                _templeService.FollowChannel(new FollowChannelParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    ReadTts = true
                });
            }
            else
            {
                // 6. Giả lập chia sẻ live
                _templeService.ShareStream(new ShareStreamParams
                {
                    User = pick.User,
                    UniqueId = pick.UniqueId,
                    ReadTts = true
                });
            }
            return;
        }

        if (roll < 0.35)
        {
            // 1. Giả lập Phật tử vào Chánh Điện (Chào mừng & Chúc phúc cầu an)
            string wish = AuspiciousWishes[_rnd.Next(AuspiciousWishes.Length)];
            _templeService.GreetMember(new GreetMemberParams
            {
                User = pick.User,
                UniqueId = pick.UniqueId,
                Wish = wish,
                ReadTts = true
            });
        }
        else if (roll < 0.65)
        {
            // 2. Thắp hương bái Phật
            _templeService.BurnIncense(new BurnIncenseParams
            {
                User = pick.User,
                UniqueId = pick.UniqueId,
                Count = 3,
                Wish = pick.Wish,
                ReadTts = true
            });
        }
        else if (roll < 0.85)
        {
            // 3. Gõ mõ tích công đức
            _templeService.StrikeWoodenFish(new StrikeWoodenFishParams
            {
                User = pick.User,
                UniqueId = pick.UniqueId,
                Count = 3
            });
        }
        else
        {
            // 4. Thả hoa đăng cầu phúc
            _templeService.SendPrayer(new SendPrayerParams
            {
                User = pick.User,
                UniqueId = pick.UniqueId,
                Wish = pick.Wish,
                ReadTts = true
            });
        }
    }
}

