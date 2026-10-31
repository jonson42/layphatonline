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
        var pick = SimDevotees[_rnd.Next(SimDevotees.Length)];
        double roll = _rnd.NextDouble();

        if (roll < 0.40)
        {
            _templeService.BurnIncense(new BurnIncenseParams
            {
                User = pick.User,
                UniqueId = pick.UniqueId,
                Count = 3,
                Wish = pick.Wish,
                ReadTts = false // Tắt TTS giả lập để nhường cho người xem thật
            });
        }
        else if (roll < 0.75)
        {
            _templeService.StrikeWoodenFish(new StrikeWoodenFishParams
            {
                User = pick.User,
                UniqueId = pick.UniqueId,
                Count = 3
            });
        }
        else if (roll < 0.95)
        {
            _templeService.SendPrayer(new SendPrayerParams
            {
                User = pick.User,
                UniqueId = pick.UniqueId,
                Wish = pick.Wish,
                ReadTts = false
            });
        }
        else
        {
            // Chỉ 5% rất hiếm khi gieo quẻ trong chế độ chạy thử
            _templeService.DrawFortune(new DrawFortuneParams
            {
                User = pick.User,
                UniqueId = pick.UniqueId,
                Topic = pick.Wish,
                ReadTts = false
            });
        }
    }
}

