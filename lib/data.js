export const GROUPS = [
  { id:1, name:"Vị trí & Lưu lượng", weight:20, t4:"T1 — TẬP TRUNG" },
  { id:2, name:"Tầm nhìn & Nhận diện", weight:10, t4:"T2 — TẦM NHÌN" },
  { id:3, name:"Tiếp cận & Parking", weight:12, t4:"T3 — TIẾP CẬN" },
  { id:4, name:"Không gian & Layout", weight:15, t4:"T4 — TÍNH CHẤT" },
  { id:5, name:"Hạ tầng kỹ thuật", weight:12, t4:"T4 — TÍNH CHẤT" },
  { id:6, name:"Kho & Hậu cần", weight:8, t4:"T4 — TÍNH CHẤT" },
  { id:7, name:"Đa kênh & Delivery", weight:8, t4:"T3 — TIẾP CẬN" },
  { id:8, name:"Nhân sự & Phúc lợi", weight:5, t4:"" },
  { id:9, name:"Pháp lý & Hợp đồng", weight:5, t4:"" },
  { id:10, name:"Chiến lược & Thương hiệu", weight:5, t4:"" },
];

export const CRITERIA = [
  {g:1,n:"Lưu lượng người đi bộ giờ cao điểm",c:true,w:12,g1:"<500 người/giờ",g3:"1.000–2.000",g5:">3.000"},
  {g:1,n:"Lưu lượng xe cơ giới giờ cao điểm",c:false,w:8,g1:"<200 xe/giờ",g3:"500–1.000",g5:">1.500, chậm"},
  {g:1,n:"Tệp khách phù hợp chân dung mục tiêu",c:true,w:15,g1:"<20% phù hợp",g3:"40–60%",g5:">80%"},
  {g:1,n:"Mật độ dân cư bán kính 1km",c:false,w:10,g1:"<2.000 hộ",g3:"5.000–8.000",g5:">12.000"},
  {g:1,n:"Cụm tiện ích lân cận",c:false,w:8,g1:"Không có",g3:"2–3 trong 500m",g5:"≥5 trong 500m"},
  {g:1,n:"Khoảng cách đối thủ trực diện",c:false,w:10,g1:"<50m",g3:"100–200m",g5:">300m"},
  {g:1,n:"Mật độ F&B khu vực (cluster)",c:false,w:7,g1:"Quá ít/nhiều cùng phân khúc",g3:"Khác phân khúc",g5:"Đa dạng, chưa có concept tương tự"},
  {g:1,n:"Xu hướng phát triển 3–5 năm",c:false,w:8,g1:"Suy thoái",g3:"Ổn định",g5:"Phát triển mạnh"},
  {g:1,n:"An ninh khu vực",c:false,w:7,g1:"Mất an ninh",g3:"Bình thường",g5:"Tốt, có camera"},
  {g:1,n:"Không bị ngập nước mùa mưa",c:true,w:10,g1:"Ngập >30cm",g3:"Nhẹ 1–2 lần/năm",g5:"Không ngập"},
  {g:1,n:"Không nằm vùng quy hoạch giải tỏa",c:true,w:5,g1:"Đã có QĐ giải tỏa",g3:"Chưa rõ",g5:"Xác nhận không QH"},
  {g:2,n:"Tầm nhìn bảng hiệu từ xa (≥30m)",c:false,w:20,g1:"Không thấy từ 10m",g3:"15–25m",g5:">30m rõ ràng"},
  {g:2,n:"Bảng hiệu không bị che khuất",c:false,w:20,g1:"Che >50%",g3:"Che nhẹ 1 góc",g5:"Không bị che"},
  {g:2,n:"Mặt tiền đủ rộng triển khai nhận diện",c:false,w:20,g1:"<3m",g3:"3–5m",g5:">6m, 2 mặt"},
  {g:2,n:"Trục di chuyển chính / ngã tư",c:false,w:15,g1:"Hẻm/ngõ cụt",g3:"Đường phụ",g5:"Đường chính"},
  {g:2,n:"Ánh sáng ban đêm",c:false,w:10,g1:"Tối",g3:"Đèn đường cơ bản",g5:"Sầm uất"},
  {g:2,n:"Khả năng lắp biển hiệu ngoài trời",c:false,w:15,g1:"Không được phép",g3:"Hạn chế",g5:"Thoải mái"},
  {g:3,n:"Không bị dải phân cách cản trở",c:true,w:18,g1:"Vòng >200m",g3:"Lối mở <100m",g5:"Không có DPC"},
  {g:3,n:"Bãi xe máy đủ (≥15 xe)",c:false,w:15,g1:"<5 chỗ",g3:"8–15",g5:">15, có tổ chức"},
  {g:3,n:"Chỗ đỗ ô tô",c:false,w:10,g1:"Không có <200m",g3:"Bãi 100–200m",g5:"Ngay trước <50m"},
  {g:3,n:"Lối vào rộng, dễ quan sát",c:false,w:12,g1:"<1.5m",g3:"1.5–2.5m",g5:">2.5m rõ"},
  {g:3,n:"Vỉa hè dễ dừng đỗ nhanh",c:false,w:10,g1:"Cấm đỗ",g3:"Hẹp, tạm được",g5:">2m, dễ đỗ"},
  {g:3,n:"Không nằm đường cấm đỗ giờ cao điểm",c:false,w:10,g1:"Cấm cả ngày",g3:"Cấm 1–2 khung",g5:"Không cấm"},
  {g:3,n:"Shipper dễ tiếp cận",c:false,w:12,g1:"1 chiều ngược",g3:"Được nhưng mất TG",g5:"Dễ, chỗ dừng riêng"},
  {g:3,n:"Mái che lối vào",c:false,w:8,g1:"Không có",g3:"Tạm",g5:"Đầy đủ"},
  {g:3,n:"Không gần nguồn mùi/ồn",c:false,w:5,g1:"Nặng",g3:"Nhẹ theo giờ",g5:"Không có"},
  {g:4,n:"Diện tích phù hợp mô hình chuẩn",c:true,w:15,g1:"Thiếu >30%",g3:"80–100%",g5:"100–120%"},
  {g:4,n:"Mặt tiền đủ rộng cho concept",c:false,w:10,g1:"<3m",g3:"3–5m",g5:">5m, góc"},
  {g:4,n:"Trần cao đạt chuẩn (≥3.2m)",c:false,w:8,g1:"<2.7m",g3:"2.7–3.2m",g5:">3.2m"},
  {g:4,n:"Ít cột/dầm ảnh hưởng layout",c:false,w:8,g1:">3 cột vướng",g3:"1–2 xử lý được",g5:"Không có"},
  {g:4,n:"Flow khách tự nhiên",c:false,w:12,g1:"Đứt đoạn",g3:"Cơ bản, cần chỉnh",g5:"Liền mạch"},
  {g:4,n:"Vị trí bar/quầy trung tâm",c:false,w:10,g1:"Không có vị trí",g3:"Không lý tưởng",g5:"Trung tâm, focal point"},
  {g:4,n:"WC khách đạt chuẩn",c:false,w:7,g1:"Không có/rất kém",g3:"Có, TB",g5:"Sạch, đủ, hợp lý"},
  {g:4,n:"Không gian ngoài trời",c:false,w:5,g1:"Không có",g3:"Nhỏ",g5:"Đẹp, tận dụng tốt"},
  {g:4,n:"Âm thanh không dội/vang",c:false,w:5,g1:"Vang nặng",g3:"Hơi vang",g5:"Tốt tự nhiên"},
  {g:4,n:"Khả năng chia zone",c:false,w:10,g1:"Không thể",g3:"2 zone",g5:"3+ zone rõ"},
  {g:4,n:"Tầng lửng/tầng 2 khai thác",c:false,w:5,g1:"Cầu thang hẹp",g3:"Khai thác 1 phần",g5:"Khai thác tốt"},
  {g:4,n:"BOH đủ cho bếp/kho",c:true,w:5,g1:"Không có BOH riêng",g3:"Nhỏ, cần tối ưu",g5:"Đủ rộng, tách biệt"},
  {g:5,n:"Công suất điện đủ tải",c:true,w:18,g1:"<15kW",g3:"15–25kW",g5:">25kW sẵn sàng"},
  {g:5,n:"Điện 3 pha",c:false,w:12,g1:"1 pha, không nâng",g3:"Có thể nâng",g5:"Sẵn 3 pha"},
  {g:5,n:"Nước cấp ổn định",c:true,w:12,g1:"Yếu/mất thường xuyên",g3:"80% ổn định",g5:"100% ổn định"},
  {g:5,n:"Thoát nước tốt",c:false,w:10,g1:"Kém, hay tắc",g3:"TB",g5:"Tốt, hố ga riêng"},
  {g:5,n:"PCCC đạt chuẩn",c:true,w:12,g1:"Không đạt",g3:"Cần bổ sung",g5:"Đạt chuẩn"},
  {g:5,n:"Lối thoát hiểm",c:false,w:8,g1:"Không có",g3:"Chưa chuẩn",g5:"Đạt chuẩn"},
  {g:5,n:"Internet ≥2 đường truyền",c:false,w:8,g1:"1 nhà mạng yếu",g3:"2, TB",g5:"≥2, tốc độ cao"},
  {g:5,n:"Lắp HVAC/điều hòa",c:false,w:8,g1:"Không lắp được",g3:"Cần chỉnh sửa",g5:"Sẵn sàng"},
  {g:5,n:"Vị trí camera an ninh",c:false,w:6,g1:"Nhiều điểm mù",g3:"1–2 điểm mù",g5:"Phủ hết"},
  {g:5,n:"Hệ thống gas",c:false,w:6,g1:"Không có",g3:"Kéo được",g5:"Sẵn đạt chuẩn"},
  {g:6,n:"Lối nhập hàng riêng",c:false,w:20,g1:"Qua cửa chính",g3:"Cửa phụ, qua FOH",g5:"Riêng biệt"},
  {g:6,n:"Xe tải dừng nhập hàng",c:false,w:15,g1:"Không có chỗ",g3:"Ảnh hưởng GT",g5:"Chỗ riêng"},
  {g:6,n:"Diện tích kho đạt chuẩn",c:false,w:20,g1:"<5m²",g3:"5–10m²",g5:">10m², có kệ"},
  {g:6,n:"Kho không ẩm, thông gió",c:false,w:15,g1:"Ẩm, mốc",g3:"Hơi ẩm theo mùa",g5:"Khô ráo quanh năm"},
  {g:6,n:"Trần kho ≥2.5m",c:false,w:10,g1:"<2m",g3:"2–2.5m",g5:">2.5m"},
  {g:6,n:"Mở rộng kho 20–30%",c:false,w:10,g1:"Không thể",g3:"Tối ưu nhẹ",g5:"Có dự phòng"},
  {g:6,n:"Nhập hàng không ảnh hưởng khách",c:false,w:10,g1:"Giờ cao điểm qua FOH",g3:"Sớm/muộn qua FOH",g5:"Riêng biệt"},
  {g:7,n:"Khu take-away/online riêng",c:false,w:20,g1:"Lẫn dine-in",g3:"Nhỏ/chung quầy",g5:"Riêng, có signage"},
  {g:7,n:"Lối riêng cho shipper",c:false,w:20,g1:"Chung cửa chính",g3:"Chung lối",g5:"Lối riêng"},
  {g:7,n:"Không xung đột dine-in vs delivery",c:false,w:20,g1:"Xung đột nặng",g3:"Nhẹ",g5:"Tách biệt"},
  {g:7,n:"Chỗ đậu xe shipper",c:false,w:15,g1:"Không có",g3:"Chung khách",g5:"Riêng ≥3 xe"},
  {g:7,n:"Không gian đóng gói online",c:false,w:15,g1:"Không có",g3:"Chung bar",g5:"Khu riêng"},
  {g:7,n:"Địa chỉ dễ tìm trên app",c:false,w:10,g1:"Hẻm sâu",g3:"Tìm được",g5:"Mặt tiền chính"},
  {g:8,n:"Dễ tuyển nhân sự",c:false,w:25,g1:"Rất khó",g3:"Được, mất TG",g5:"Dễ tuyển"},
  {g:8,n:"An toàn ca tối",c:false,w:20,g1:"Nguy hiểm",g3:"Tương đối",g5:"An toàn"},
  {g:8,n:"Không gian nghỉ NV",c:false,w:20,g1:"Không có",g3:"Góc nhỏ",g5:"Phòng riêng"},
  {g:8,n:"WC riêng NV",c:false,w:15,g1:"Chung khách",g3:"Tách giờ",g5:"Riêng"},
  {g:8,n:"Chỗ để đồ/thay đồ",c:false,w:10,g1:"Không có",g3:"Kệ đơn giản",g5:"Locker đầy đủ"},
  {g:8,n:"GTCC gần",c:false,w:10,g1:"Xa, khó đặt xe",g3:"Ít chuyến",g5:"Gần trạm"},
  {g:9,n:"Chủ nhà sở hữu hợp pháp",c:true,w:25,g1:"Tranh chấp",g3:"Chưa hoàn chỉnh",g5:"Sổ đỏ rõ ràng"},
  {g:9,n:"Thời hạn thuê ≥5 năm",c:false,w:20,g1:"<3 năm",g3:"3–5 năm",g5:"≥5 năm + gia hạn"},
  {g:9,n:"Tăng giá thuê ≤8%/năm",c:false,w:18,g1:">15%/năm",g3:">8%/năm",g5:"≤8%, rõ ràng"},
  {g:9,n:"Ưu tiên gia hạn",c:false,w:12,g1:"Không có",g3:"Không ràng buộc",g5:"Có penalty"},
  {g:9,n:"Không vướng quy hoạch",c:true,w:15,g1:"Trong vùng QH",g3:"Chưa rõ",g5:"Xác nhận không"},
  {g:9,n:"Thuê ≤15% DT kỳ vọng",c:false,w:10,g1:">20%",g3:"15–20%",g5:"≤15%"},
  {g:10,n:"Phù hợp định vị VietArt",c:false,w:30,g1:"Xung đột",g3:"Chấp nhận được",g5:"Nâng tầm"},
  {g:10,n:"Tiềm năng thống trị khu vực",c:false,w:25,g1:"Khó cạnh tranh",g3:"Ngang",g5:"Top 1"},
  {g:10,n:"Nâng cấp/mở rộng tương lai",c:false,w:20,g1:"Không thể",g3:"Nhẹ",g5:"Mở rộng được"},
  {g:10,n:"Synergy outlet hiện có",c:false,w:15,g1:"Trùng catchment",g3:"Không ảnh hưởng",g5:"Bổ trợ tốt"},
  {g:10,n:"Phù hợp chiến lược mở rộng",c:false,w:10,g1:"Không nằm trong KH",g3:"1 phần",g5:"Đúng roadmap"},
];

export const TRAFFIC_SLOTS = [
  { label:"Sáng sớm", time:"6:30–8:30" },
  { label:"Trưa", time:"11:00–13:00" },
  { label:"Chiều", time:"15:00–17:00" },
  { label:"Tối", time:"19:00–21:00" },
];

export const SURVEY_FIELDS = [
  { key:"address", label:"Địa chỉ đầy đủ", type:"text" },
  { key:"area", label:"Diện tích (m²)", type:"text" },
  { key:"frontage", label:"Chiều ngang mặt tiền (m)", type:"text" },
  { key:"shape", label:"Hình dạng mặt bằng", type:"text" },
  { key:"floors", label:"Số tầng sử dụng", type:"text" },
  { key:"ceilingH", label:"Trần cao tầng trệt (m)", type:"text" },
  { key:"wcCount", label:"Số WC hiện có", type:"text" },
  { key:"condition", label:"Hiện trạng trần–sàn–tường", type:"textarea" },
  { key:"rent", label:"Giá thuê (VNĐ/tháng)", type:"text" },
  { key:"leaseTerm", label:"Thời hạn thuê đề nghị", type:"text" },
  { key:"landlord", label:"Chủ nhà: Chính chủ / Trung gian", type:"text" },
  { key:"concept", label:"Concept dự kiến", type:"text" },
];

export const SURVEY_SECTIONS = [
  { key:"env", title:"Môi trường xung quanh", color:"green", fields:[
    {key:"env_biz",label:"Loại hình KD xung quanh"},
    {key:"env_attract",label:"Điểm hút khách phụ trợ"},
    {key:"env_construction",label:"Công trình đang xây dựng?"},
    {key:"env_security",label:"An ninh khu vực"},
  ]},
  { key:"legal", title:"Pháp lý & Chủ nhà", color:"red", fields:[
    {key:"legal_owner",label:"Chính chủ? Giấy tờ?"},
    {key:"legal_terms",label:"Điều khoản tăng giá & gia hạn"},
    {key:"legal_support",label:"Miễn phí thuê / hỗ trợ thi công"},
    {key:"legal_planning",label:"Vướng quy hoạch?"},
  ]},
  { key:"infra", title:"Hạ tầng kỹ thuật", color:"slate", fields:[
    {key:"infra_elec",label:"Điện: kW? 1/3 pha?"},
    {key:"infra_water",label:"Nước: ổn định?"},
    {key:"infra_drain",label:"Thoát nước & ngập?"},
    {key:"infra_pccc",label:"PCCC hiện trạng"},
  ]},
];

export function getVerdict(pct, critFails) {
  if (critFails > 0) return { label:"❌ CRITICAL FAIL", color:"#C62828", bg:"#FFCDD2", desc:"Tiêu chí sống còn không đạt" };
  if (pct >= 0.85) return { label:"🌟 EXCELLENT", color:"#2E7D32", bg:"#E8F5E9", desc:"Ưu tiên ký HĐ ngay" };
  if (pct >= 0.70) return { label:"✅ GOOD", color:"#2E7D32", bg:"#E8F5E9", desc:"Đề xuất duyệt" };
  if (pct >= 0.60) return { label:"⚠️ ACCEPTABLE", color:"#E65100", bg:"#FFF8E1", desc:"Cần khắc phục" };
  return { label:"❌ REJECT", color:"#C62828", bg:"#FFCDD2", desc:"Không đề xuất" };
}

export function calcResults(locations) {
  return locations.map(l => {
    const groupScores = GROUPS.map(g => {
      const gc = CRITERIA.filter(c => c.g === g.id);
      let weighted = 0, maxW = 0, critFails = 0, answered = 0;
      gc.forEach(c => {
        const idx = CRITERIA.indexOf(c);
        const score = l.scores?.[idx];
        const sw = c.w / 100, gw = g.weight / 100;
        maxW += 5 * sw * gw;
        if (score) { weighted += score * sw * gw; answered++; if (c.c && score <= 2) critFails++; }
      });
      return { groupId:g.id, weighted, maxW, critFails, answered };
    });
    const totalW = groupScores.reduce((s,g) => s+g.weighted, 0);
    const totalMax = groupScores.reduce((s,g) => s+g.maxW, 0);
    const totalCrit = groupScores.reduce((s,g) => s+g.critFails, 0);
    const pct = totalMax > 0 ? totalW / totalMax : 0;
    const answered = groupScores.reduce((s,g) => s+g.answered, 0);
    const verdict = answered > 0 ? getVerdict(pct, totalCrit) : null;
    return { locId:l.id, name:l.name, groupScores, totalW, totalMax, pct, totalCrit, verdict, answered };
  });
}
