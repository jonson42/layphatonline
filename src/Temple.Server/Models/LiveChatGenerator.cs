using System;

namespace Temple.Server.Models;

public static class LiveChatGenerator
{
    // Lời chúc buổi sáng (5:00 - 10:59)
    private static readonly string[] MorningMessages = new[]
    {
        "Chào ngày mới tràn đầy năng lượng nha cả nhà",
        "Buổi sáng an lành và may mắn nhé mọi người",
        "Chúc cả nhà ngày mới thuận buồm xuôi gió, ngập tràn tài lộc",
        "Sáng sớm vào phòng live ấm áp quá",
        "Mới vào thả tim điểm danh buổi sáng nào anh em",
        "Chúc ngày mới công việc hanh thông, vạn sự như ý",
        "Chào ngày mới, chúc phiên live sáng nay bùng nổ nhé",
        "Sáng ra xem live thư thái tinh thần, đón nhiều bình an",
        "Cả nhà thả tim ủng hộ phòng live khởi đầu ngày mới xôm tụ nha",
        "Chúc mọi người một ngày làm việc học tập nhiều niềm vui và may mắn"
    };

    // Lời chúc buổi trưa (11:00 - 13:59)
    private static readonly string[] NoonMessages = new[]
    {
        "Buổi trưa vui vẻ nha cả nhà",
        "Buổi trưa ấm áp nhé mọi người",
        "Chúc mọi người bữa trưa ngon miệng và an lành",
        "Nghỉ trưa vào live thư giãn thật thoải mái",
        "Trưa nay phòng live đông vui quá",
        "Nghỉ trưa thả nhẹ quả tim điểm danh nào anh em",
        "Cả nhà ăn trưa vui vẻ và nhiều niềm vui nhé",
        "Mới vào thả tim ủng hộ chủ phòng nào mọi người ơi",
        "Chúc mọi người nghỉ trưa nạp lại năng lượng thật tốt",
        "Live trưa nay cuốn quá, ngồi hóng mãi không chán"
    };

    // Lời chúc buổi chiều (14:00 - 17:59)
    private static readonly string[] AfternoonMessages = new[]
    {
        "Buổi chiều vui vẻ và mát mẻ nha cả nhà",
        "Chúc mọi người buổi chiều làm việc hiệu quả, thuận lợi",
        "Chiều nay phòng live xôm tụ và náo nhiệt quá",
        "Chúc cả nhà một buổi chiều an lành, gặp nhiều may mắn",
        "Chiều về ghé live thư giãn thật nhẹ nhàng",
        "Anh em vào live thả nhẹ quả tim tiếp thêm động lực cho chủ phòng nào",
        "Chúc mọi người hoàn thành tốt công việc trong buổi chiều nhé",
        "Âm thanh hình ảnh chiều nay mượt mà quá cả nhà"
    };

    // Lời chúc buổi tối & đêm (18:00 - 4:59)
    private static readonly string[] EveningMessages = new[]
    {
        "Buổi tối vui vẻ nha cả nhà",
        "Buổi tối ấm áp nhé mọi người",
        "Chúc mọi người buổi tối an lành nha",
        "Tối nay phòng live đông vui quá",
        "Mới vào thả tim ủng hộ chủ phòng nào anh em",
        "Nhờ cả nhà bấm vào màn hình để thả tim trợ duyên cho buổi phóng sinh nhé ❤️",
        "Cả nhà ơi, cùng bấm liên tục vào màn hình để thả tim giúp phòng live lên xu hướng nha ✨",
        "Mỗi lượt bấm vào màn hình thả tim là một phước lành trợ duyên, cả nhà cùng thả tim nhé 🙏",
        "Chúc cả nhà xem live vui vẻ nhé",
        "Live tối nay cuốn quá, ngồi xem mãi không chán",
        "Cả nhà thả tim nhiệt tình cho xôm tụ nha",
        "Đi làm về vào xem live thư giãn thật sự",
        "Chúc mọi người một đêm nhiều niềm vui và may mắn",
        "Ai đang xem thả nhẹ quả tim điểm danh nào",
        "Âm thanh hình ảnh tối nay mượt quá",
        "Chào chủ phòng, chúc phiên live tối nay bùng nổ nhé",
        "Ngồi hóng mãi mới thấy lên live"
    };

    // Mẫu câu chào đón thành viên mới vào phòng live
    private static readonly string[] MemberGreetingTemplates = new[]
    {
        "Chào mừng @{0} đã vào phòng live, nhờ bạn và cả nhà bấm vào màn hình để thả tim ủng hộ nhé! Chúc bạn {1} vạn sự như ý ✨",
        "Chào @{0}, nhờ mọi người bấm vào màn hình để thả tim trợ duyên cho buổi phóng sinh chim nhé! Chúc bạn {1} an lành 🕊️",
        "Chào mừng @{0} ghé thăm phòng live, chúc bạn {1} ấm áp, an lành nha",
        "Chào @{0}, chúc bạn và gia đình {1} vui vẻ, vạn sự cát tường",
        "Rất vui được đón tiếp @{0}, bấm vào màn hình thả tim ủng hộ phòng live nhé bạn ơi ❤️",
        "Hoan nghênh @{0} đã tới phòng live, cả nhà cùng bấm vào màn hình thả tim trợ duyên nào 🔥"
    };

    private static readonly string[] Icons = new[]
    {
        " ❤️", " ✨", " 🔥", " 🎉", " 🥰", " 🌸", " 🍀", " 👍", ""
    };

    private static readonly Random _random = new Random();

    /// <summary>
    /// Xác định danh xưng buổi trong ngày theo giờ địa phương hiện tại.
    /// </summary>
    public static string GetTimeOfDayGreeting()
    {
        int hour = DateTime.Now.Hour;
        if (hour >= 5 && hour < 11) return "buổi sáng";
        if (hour >= 11 && hour < 14) return "buổi trưa";
        if (hour >= 14 && hour < 18) return "buổi chiều";
        return "buổi tối";
    }

    /// <summary>
    /// Lấy danh sách câu chat ngẫu nhiên tương ứng theo thời điểm trong ngày.
    /// </summary>
    public static string[] GetCurrentTimeMessages()
    {
        int hour = DateTime.Now.Hour;
        if (hour >= 5 && hour < 11) return MorningMessages;
        if (hour >= 11 && hour < 14) return NoonMessages;
        if (hour >= 14 && hour < 18) return AfternoonMessages;
        return EveningMessages;
    }

    /// <summary>
    /// Sinh câu bình luận ngẫu nhiên phù hợp thời điểm trong ngày kèm biểu tượng cảm xúc.
    /// </summary>
    public static string GetRandomChatMessage()
    {
        string[] messages = GetCurrentTimeMessages();
        string msg = messages[_random.Next(messages.Length)];
        string icon = Icons[_random.Next(Icons.Length)];
        return $"{msg}{icon}".Trim();
    }

    /// <summary>
    /// Sinh lời chào đón thành viên mới vào phòng live (cá nhân hóa kèm tên người dùng và buổi trong ngày).
    /// </summary>
    public static string GetMemberGreeting(string? userName)
    {
        string clean = (userName ?? "").Trim();
        if (string.IsNullOrWhiteSpace(clean) || clean.Equals("Thí Chủ", StringComparison.OrdinalIgnoreCase))
        {
            return GetRandomChatMessage();
        }

        string timeOfDay = GetTimeOfDayGreeting();
        string template = MemberGreetingTemplates[_random.Next(MemberGreetingTemplates.Length)];
        string icon = Icons[_random.Next(Icons.Length)];
        string formatted = string.Format(template, clean, timeOfDay);
        return $"{formatted}{icon}".Trim();
    }
}

