import type { Content } from "./types";

// Source of truth for every word on the site. en.ts mirrors this file.
export const vi: Content = {
  meta: {
    title: "Nguyễn Ngọc Anh — Kinh doanh · Dự án · Sáng tạo",
    description:
      "Portfolio của Nguyễn Ngọc Anh — sinh viên Kinh tế Đối ngoại, Đại học Ngoại thương. Quản lý dự án, vận hành kinh doanh, truyền thông – thiết kế.",
  },
  nav: {
    skipToContent: "Bỏ qua, đến nội dung chính",
    switchLocale: "EN",
    switchLocaleLabel: "Xem bản tiếng Anh",
    contact: "Liên hệ",
    backToTop: "Lên đầu trang",
    chapterRail: "Các chương",
    sound: "Âm thanh",
  },
  chapters: {
    hero: "Mở đầu",
    about: "Về mình",
    journey: "Hành trình",
    principles: "Cách làm việc",
    projects: "Dự án",
    education: "Học vấn",
    direction: "Định hướng",
    skills: "Kỹ năng",
    contact: "Liên hệ",
  },
  present: "Nay",
  hero: {
    kicker: "01 — Trang mở đầu",
    tagline: ["Kinh doanh", "Dự án", "Sáng tạo"],
    intro: [
      "Mình là sinh viên *Kinh tế Đối ngoại* tại *Đại học Ngoại thương*, với trải nghiệm trong quản lý dự án, vận hành kinh doanh và truyền thông – thiết kế.",
      "Mình quan tâm đến cách một ý tưởng được tổ chức, triển khai và phát triển thành kết quả thực tế.",
    ],
    cta: "Khám phá hành trình của mình",
    scrollHint: "Cuộn xuống",
  },
  about: {
    kicker: "02 — Về mình",
    heading: "Mình là Ngọc Anh.",
    paragraphs: [
      "Hiện tại, mình đang theo học ngành Kinh tế Đối ngoại tại Đại học Ngoại thương.",
      "Trong quá trình học tập và làm việc, mình đã có cơ hội trải nghiệm ở nhiều môi trường khác nhau — từ vận hành kinh doanh online, thiết kế nhận diện thương hiệu đến hỗ trợ quản lý dự án CNTT.",
      "Mỗi công việc cho mình một góc nhìn khác về cách một tổ chức vận hành và cách một dự án được đưa từ ý tưởng đến thực tế.",
      "Qua những trải nghiệm đó, mình dần hình thành cách làm việc dựa trên ba điều: *tổ chức công việc rõ ràng*, *phối hợp hiệu quả* và *chủ động giải quyết vấn đề*.",
      "Hiện tại, mình muốn tiếp tục phát triển theo hướng *Logistics & Chuỗi cung ứng*, đồng thời tích lũy thêm kinh nghiệm về quản lý dự án và vận hành kinh doanh.",
    ],
  },
  journey: {
    kicker: "03 — Hành trình",
    heading: "Những trải nghiệm đã định hình cách mình làm việc.",
    items: {
      design: {
        role: "Thiết kế nhận diện thương hiệu",
        org: "Freelancer",
        story: [
          "Mình bắt đầu với các dự án thiết kế bộ nhận diện thương hiệu và truyền thông.",
          "Đến nay, mình đã thực hiện *hơn 5 dự án*, với quy mô từ *100–300+ người tham gia*.",
          "Công việc này giúp mình hiểu rằng một sản phẩm thiết kế không chỉ cần đẹp về mặt hình ảnh, mà còn phải phù hợp với thông điệp và mục tiêu của dự án.",
        ],
        tags: ["Thiết kế", "Nhận diện thương hiệu", "Truyền thông"],
      },
      silk: {
        role: "Kinh doanh Online",
        org: "Sản phẩm Tơ tằm Nghệ nhân",
        story: [
          "Mình trực tiếp tham gia vào quá trình vận hành hoạt động kinh doanh, từ nhập hàng, định giá, quản lý tồn kho đến xử lý đơn hàng và chăm sóc khách hàng.",
          "Đây là trải nghiệm giúp mình tiếp cận hoạt động kinh doanh từ góc độ thực tế hơn — nơi từng khâu trong quy trình đều có ảnh hưởng đến hiệu quả vận hành và trải nghiệm của khách hàng.",
        ],
        tags: ["Vận hành kinh doanh", "Quản lý tồn kho", "Đơn hàng", "Khách hàng"],
      },
      dongAm: {
        role: "Leader Ban Truyền thông",
        org: "Chiến dịch Đông Ấm",
        story: [
          "Ở vai trò Leader Ban Truyền thông, mình phụ trách thiết kế bộ nhận diện và quản lý chất lượng nội dung truyền thông của chiến dịch.",
          "Bên cạnh công việc chuyên môn, mình có cơ hội phối hợp với các thành viên trong team để đảm bảo hình ảnh và thông điệp của dự án được triển khai nhất quán.",
        ],
        tags: ["Truyền thông", "Nhận diện hình ảnh", "Làm việc nhóm"],
      },
      vmo: {
        role: "Trợ lý Dự án",
        org: "VMO Group",
        story: [
          "Tại VMO Group, mình hỗ trợ Project Manager trong việc theo dõi tiến độ, rủi ro, thay đổi và báo cáo dự án CNTT theo quy trình PMO.",
          "Mình cũng tham gia quản lý tài liệu và phối hợp với các bên liên quan trong môi trường Agile.",
          "Trải nghiệm này giúp mình hiểu rõ hơn về phần công việc phía sau một dự án — nơi việc theo dõi thông tin, tiến độ và phối hợp giữa các bên đóng vai trò quan trọng trong quá trình triển khai.",
        ],
        tags: ["Quản lý dự án", "PMO", "Phối hợp", "Quản lý tài liệu"],
      },
    },
    designStats: ["dự án", "người tham gia"],
    silkStages: ["Nhập hàng", "Định giá", "Tồn kho", "Đơn hàng", "Khách hàng"],
    vmoTracks: ["Tiến độ", "Rủi ro", "Thay đổi", "Báo cáo"],
  },
  principles: {
    kicker: "04 — Điều mình mang đến",
    heading: "Cách mình làm việc",
    items: [
      {
        title: "Tổ chức",
        body: "Mình chú trọng xây dựng cách làm việc rõ ràng, từ lập kế hoạch, theo dõi tiến độ đến quản lý thông tin và tài liệu.",
      },
      {
        title: "Phối hợp",
        body: "Mình có kinh nghiệm làm việc với nhiều nhóm và các bên liên quan, với mục tiêu đảm bảo thông tin được truyền đạt rõ ràng và công việc được triển khai thống nhất.",
      },
      {
        title: "Phân tích",
        body: "Nền tảng học tập và trải nghiệm thực tế giúp mình hình thành cách tiếp cận vấn đề có hệ thống, tập trung vào việc xác định vấn đề và tìm hướng xử lý phù hợp.",
      },
      {
        title: "Sáng tạo",
        body: "Kinh nghiệm trong thiết kế và truyền thông giúp mình nhìn vấn đề không chỉ từ góc độ logic, mà còn từ cách một ý tưởng được thể hiện và truyền tải đến người khác.",
      },
    ],
  },
  projects: {
    kicker: "05 — Dự án & sản phẩm",
    heading: "Những điều mình đã thực hiện",
    lead: "Mỗi dự án là một cơ hội để mình thử một cách làm mới, giải quyết một vấn đề cụ thể và tích lũy thêm kinh nghiệm.",
    items: [
      {
        title: "Nhận diện thương hiệu",
        body: "Thiết kế bộ nhận diện và các sản phẩm hình ảnh cho dự án.",
      },
      {
        title: "Truyền thông",
        body: "Nội dung và hình ảnh phục vụ các chiến dịch và hoạt động cộng đồng.",
      },
      {
        title: "Vận hành kinh doanh",
        body: "Kinh nghiệm thực tế trong quản lý sản phẩm, đơn hàng, tồn kho và khách hàng.",
      },
      {
        title: "Quản lý dự án",
        body: "Theo dõi tiến độ, quản lý tài liệu và phối hợp các bên liên quan.",
      },
    ],
  },
  education: {
    kicker: "06 — Học vấn",
    items: {
      ftu: { school: "Đại học Ngoại thương", major: "Kinh tế Đối ngoại" },
      hnams: { school: "THPT Chuyên Hà Nội – Amsterdam", major: "Chuyên Toán" },
    },
  },
  direction: {
    kicker: "07 — Định hướng",
    heading: "Mình đang hướng đến đâu?",
    focus: "Logistics & Chuỗi cung ứng",
    paragraphs: [
      "Hiện tại, mình muốn tập trung phát triển kiến thức và kinh nghiệm trong lĩnh vực *Logistics & Chuỗi cung ứng*.",
      "Bên cạnh chuyên môn về kinh tế và thương mại quốc tế, mình muốn tiếp tục trau dồi khả năng quản lý dự án, vận hành và phối hợp đa phòng ban.",
      "Mình đặc biệt quan tâm đến cách một hệ thống được vận hành phía sau những kết quả cuối cùng — từ *con người*, *quy trình* đến cách các bộ phận *phối hợp* với nhau.",
      "Đây cũng là hướng mình muốn tiếp tục khám phá trong những trải nghiệm tiếp theo.",
    ],
    network: {
      people: "Con người",
      process: "Quy trình",
      coordination: "Phối hợp",
      result: "Kết quả",
    },
  },
  skills: {
    kicker: "08 — Kỹ năng",
    toolsHeading: "Thành thạo các công cụ",
    languageHeading: "Ngôn ngữ",
    language: "Tiếng Anh",
  },
  contact: {
    kicker: "09 — Liên hệ",
    heading: "Cùng kết nối nhé.",
    body: "Nếu bạn muốn trao đổi về một dự án, một cơ hội hợp tác hoặc đơn giản là kết nối, mình rất vui được trò chuyện.",
    emailLabel: "Email",
    phoneLabel: "Điện thoại",
    copy: "Sao chép",
    copied: "Đã sao chép",
  },
  marquee: ["Kinh doanh", "Dự án", "Sáng tạo", "Logistics", "Chuỗi cung ứng"],
  eggs: {
    hint: "Trang này giấu {count} bí mật nho nhỏ — thử gảy đàn tơ ở đầu trang, gõ nhẹ vào kén, hay gõ tên mình xem. Nhớ bật âm thanh nhé.",
    found: "Bí mật",
    allFound: "Bạn đã tìm ra tất cả bí mật! Cảm ơn bạn đã ghé chơi lâu như vậy.",
    cocoonLabel: "Gõ nhẹ vào kén tằm",
    replayLabel: "Xem lại hình minh hoạ",
    messages: {
      pluck: "Bạn vừa gảy sợi tơ. Nghe thấy không?",
      strum: "Một khúc đàn tranh trên dây tơ — hay lắm!",
      hatch: "Kén đã nở — một chú ngài tơ vừa bay ra!",
      secretWord: "Bạn biết tên mình rồi đó.",
      dispatch: "Một đơn hàng vừa được giao đến Kết quả.",
      replay: "Làm lại lần nữa — vẫn gọn gàng như cũ.",
      spin: "Bạn vừa quay cả thế giới. Hàng vẫn giao đúng hẹn.",
      knot: "Nút thắt đã buộc. Cùng kết nối nhé!",
    },
  },
};
