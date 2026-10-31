using Temple.Server.Models;

namespace Temple.Server.Services;

public static class FortuneDeck
{
    public static readonly List<FortuneStick> Deck = new()
    {
        new FortuneStick
        {
            Number = 1,
            Rank = "Thượng Thượng Cát",
            Title = "Nhật Xuất Đông Phương — Mặt Trời Mọc Phương Đông",
            Poem = "Đông phương nhật xuất chiếu Càn Khôn\nHoa nở đầy cành rạng sắc xuân\nCông danh tài lộc đều viên mãn\nGia đạo bình an phúc lộc tồn.",
            Meaning = "Mọi sự mưu cầu đều đại cát đại lợi. Công việc hanh thông, quý nhân phù trợ, gia đình hòa thuận ấm êm.",
            TtsSummary = "Quẻ số 1, Thượng Thượng Cát, Nhật Xuất Đông Phương. Mọi sự mưu cầu đều đại cát đại lợi, công danh tài lộc viên mãn, quý nhân phù trợ."
        },
        new FortuneStick
        {
            Number = 8,
            Rank = "Thượng Cát",
            Title = "Kim Liên Khai Nở — Sen Vàng Tỏa Ngát",
            Poem = "Sen vàng nở rộ giữa hồ trong\nHương thơm lan tỏa khắp non sông\nLòng thành thắp nén nhang cầu nguyện\nTrời Phật chứng tri thỏa ước mong.",
            Meaning = "Tâm thiện lành ắt gặp phước báu. Cầu tài đắc tài, cầu bình an đắc bình an, bệnh tật tiêu trừ.",
            TtsSummary = "Quẻ số 8, Thượng Cát, Kim Liên Khai Nở. Tâm thiện lành ắt gặp phước báu, cầu tài đắc tài, cầu bình an đắc bình an."
        },
        new FortuneStick
        {
            Number = 12,
            Rank = "Đại Cát",
            Title = "Long Vân Tương Hội — Rồng Mây Gặp Gỡ",
            Poem = "Rồng thiêng gặp hội tầng mây xanh\nVượt Vũ Môn Quan rạng rỡ danh\nThí chủ kiên tâm hành thiện đạo\nPhúc dày lộc vượng khắp gia đình.",
            Meaning = "Thời vận đang lên mạnh mẽ. Thi cử đỗ đạt, kinh doanh phát đạt, gặp cơ hội lớn đổi đời.",
            TtsSummary = "Quẻ số 12, Đại Cát, Long Vân Tương Hội. Thời vận đang lên mạnh mẽ, thi cử đỗ đạt, kinh doanh phát đạt."
        },
        new FortuneStick
        {
            Number = 18,
            Rank = "Thượng Cát",
            Title = "Xuân Phong Đắc Ý — Gió Xuân Thuận Buồm",
            Poem = "Thuận buồm xuôi gió vượt trùng khơi\nBến giác bình yên nắng rạng ngời\nTài lộc dồi dào nhân duyên tốt\nBốn mùa hưng thịnh rộn niềm vui.",
            Meaning = "Đi xa gặp may, buôn bán thuận lợi, tình duyên êm đẹp, người thân mạnh khỏe.",
            TtsSummary = "Quẻ số 18, Thượng Cát, Xuân Phong Đắc Ý. Thuận buồm xuôi gió, tài lộc dồi dào, nhân duyên tốt đẹp."
        },
        new FortuneStick
        {
            Number = 24,
            Rank = "Trung Cát",
            Title = "Vũ Quá Thiên Thanh — Mưa Tạnh Trời Trong",
            Poem = "Mưa qua trời lại sáng trong ngần\nGian khó lùi xa đón phúc phần\nGiữ vững lòng thành đừng nản chí\nHoa thơm trái ngọt đến mười phân.",
            Meaning = "Khó khăn cũ sắp qua đi, vận may mới đang tới. Hãy kiên nhẫn và giữ tâm bình tĩnh.",
            TtsSummary = "Quẻ số 24, Trung Cát, Vũ Quá Thiên Thanh. Mưa qua trời lại sáng trong, gian khó lùi xa để đón phúc phần mới."
        },
        new FortuneStick
        {
            Number = 36,
            Rank = "Thượng Thượng Cát",
            Title = "Phúc Tinh Cao Chiếu — Sao Phúc Chiếu Mệnh",
            Poem = "Phúc tinh rực sáng giữa đêm rằm\nTừ bi Phật độ suốt quanh năm\nTài lộc tự nhiên về gõ cửa\nTrăm điều như ý vạn điều lành.",
            Meaning = "Sao Phúc chiếu mạng, tai qua nạn khỏi, tiền tài sung túc, gia đạo hưng long.",
            TtsSummary = "Quẻ số 36, Thượng Thượng Cát, Phúc Tinh Cao Chiếu. Sao Phúc chiếu mạng, tài lộc tự nhiên gõ cửa, trăm điều như ý."
        },
        new FortuneStick
        {
            Number = 52,
            Rank = "Thượng Cát",
            Title = "Ngọc Xuất Côn Sơn — Ngọc Quý Phát Sáng",
            Poem = "Ngọc quý Côn Sơn tỏa ánh ngời\nBấy lâu rèn giũa nay gặp thời\nTri âm tương ngộ cùng nâng đỡ\nSự nghiệp thăng hoa rạng rỡ đời.",
            Meaning = "Nỗ lực bấy lâu nay sắp được đền đáp xứng đáng. Có người tốt nâng đỡ trong công việc và cuộc sống.",
            TtsSummary = "Quẻ số 52, Thượng Cát, Ngọc Xuất Côn Sơn. Nỗ lực bấy lâu sắp được đền đáp xứng đáng, sự nghiệp thăng hoa."
        },
        new FortuneStick
        {
            Number = 68,
            Rank = "Đại Cát",
            Title = "Lộc Mã Đồng Hương — Lộc Tài Cùng Tới",
            Poem = "Lộc Mã song hành đến tận nhà\nLàm ăn buôn bán nở như hoa\nTâm thành bố thí thêm công đức\nPhú quý vinh hoa khắp một nhà.",
            Meaning = "Quẻ đại lợi về tài lộc và kinh doanh. Nên làm nhiều việc thiện để phúc đức càng thêm bền vững.",
            TtsSummary = "Quẻ số 68, Đại Cát, Lộc Mã Đồng Hương. Đại lợi về tài lộc và buôn bán, phú quý vinh hoa khắp một nhà."
        },
        new FortuneStick
        {
            Number = 81,
            Rank = "Thượng Cát",
            Title = "Nguyệt Nhập Trung Thiên — Trăng Rằm Giữa Đỉnh",
            Poem = "Trăng tròn vằng vặc giữa trời thu\nSoi sáng muôn phương sạch mây mù\nTình duyên viên mãn gia đình thuận\nTâm an vạn sự chẳng ưu tư.",
            Meaning = "Tình duyên và gia đạo vô cùng tốt đẹp. Người độc thân dễ gặp ý trung nhân, gia đình thêm tin vui.",
            TtsSummary = "Quẻ số 81, Thượng Cát, Nguyệt Nhập Trung Thiên. Tình duyên viên mãn, gia đình hòa thuận, tâm an vạn sự lành."
        },
        new FortuneStick
        {
            Number = 99,
            Rank = "Thượng Thượng Cát",
            Title = "Vạn Sự Viên Thành — Cửu Cửu Đại Cát",
            Poem = "Chín tầng mây trắng ánh hào quang\nTừ bi Phật Tổ độ nhân gian\nThí chủ lòng thành dâng lễ bái\nTrọn đời trường thọ hưởng vinh khang.",
            Meaning = "Quẻ tối thượng cát tường. Sức khỏe trường thọ, công danh hiển đạt, vạn sự viên thành.",
            TtsSummary = "Quẻ số 99, Thượng Thượng Cát, Vạn Sự Viên Thành. Quẻ tối thượng cát tường, sức khỏe trường thọ, vạn sự như ý."
        }
    };

    private static readonly Random _rnd = new();

    public static FortuneStick DrawRandom()
    {
        lock (_rnd)
        {
            return Deck[_rnd.Next(Deck.Count)];
        }
    }
}

