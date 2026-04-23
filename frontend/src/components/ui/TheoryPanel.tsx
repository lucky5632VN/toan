import React, { useState } from 'react';
import { GraduationCap, ChevronDown, ChevronRight, Box, Activity, Scissors, PenTool, Database, Compass } from 'lucide-react';

const AccordionItem: React.FC<{ title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, icon, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="glass" style={{ borderRadius: '12px', marginBottom: '1rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '100%', padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: isOpen ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', cursor: 'pointer',
          color: isOpen ? '#58a6ff' : '#c9d1d9', transition: 'all 0.2s', outline: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.1rem', fontWeight: 600 }}>
          {icon} {title}
        </div>
        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </button>
      
      {isOpen && (
        <div style={{ padding: '1.2rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#c9d1d9', lineHeight: 1.7, fontSize: '0.95rem' }}>
          {children}
        </div>
      )}
    </div>
  );
};

const FormulaBlock: React.FC<{ title: string; math: React.ReactNode }> = ({ title, math }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', flex: '1 1 200px' }}>
    <div style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '0.5rem' }}>{title}</div>
    <div style={{ fontSize: '1.1rem', color: '#fbc02d', fontWeight: 600, fontFamily: 'monospace' }}>{math}</div>
  </div>
);

const TheoryPanel: React.FC = () => {
  return (
    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: '#0d1117' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #1f6feb, #388bfd)', padding: '0.8rem', borderRadius: '12px', boxShadow: '0 8px 24px rgba(31,111,235,0.3)' }}>
            <GraduationCap size={32} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>Gia Sư Ảo: Kho Lý Thuyết Tổng Hợp</h2>
            <div style={{ color: '#8b949e', fontSize: '0.9rem', marginTop: '0.4rem' }}>Tài liệu đi kèm các tính năng mô phỏng và vẽ đồ thị của ứng dụng.</div>
          </div>
        </div>

        {/* CHƯƠNG 1 */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#7ee787', margin: 0 }}>Chương I: Hình Học Không Gian (3D Geometry)</h3>
        </div>

        <AccordionItem title="Hệ trục tọa độ Oxyz & Vẽ hình" icon={<Compass size={20} />} defaultOpen={true}>
          <p>Hệ trục toạ độ không gian Oxyz được cấu tạo bởi 3 trục vuông góc từng đôi một. Trong ứng dụng, hệ trục tuân theo <b>Quy tắc bàn tay phải</b>:</p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
            <li>Trục <b>Ox</b> (Đỏ): Trục hoành, quy định chiều ngang.</li>
            <li>Trục <b>Oy</b> (Xanh lá): Trục tung, quy định chiều sâu.</li>
            <li>Trục <b>Oz</b> (Xanh dương): Trục cao, quy định chiều cao (z luôn hướng lên trên).</li>
          </ul>
          <p><b>Chức năng Vẽ hình bằng chuột:</b> Hệ thống cho phép bạn vẽ các điểm 2D trên mặt phẳng z=0. Sau đó, thuật toán sẽ tự động quét mặt cắt, dùng ShapeUtils của Three.js để nội suy tam giác (Triangulation) cho cả đa giác lõm, rồi kéo giãn (Extrude) thành khối lăng trụ 3D hoàn chỉnh.</p>
        </AccordionItem>

        <AccordionItem title="Các Khối Đa Diện Cơ Bản" icon={<Box size={20} />}>
          <p>Khối đa diện là không gian được bao bọc bởi các mặt phẳng. Các khối cơ bản trong chương trình bao gồm:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
            <FormulaBlock title="Khối Chóp (Pyramid)" math={<>V = <sup>1</sup>&frasl;<sub>3</sub> &middot; B &middot; h</>} />
            <FormulaBlock title="Khối Lăng Trụ (Prism)" math={<>V = B &middot; h</>} />
            <FormulaBlock title="Khối Hộp Chữ Nhật" math={<>V = a &middot; b &middot; c</>} />
          </div>
          <p style={{ marginTop: '1rem' }}><i>Trong đó: B là diện tích mặt đáy, h là chiều cao của khối, a, b, c là 3 kích thước của khối hộp.</i></p>
        </AccordionItem>

        <AccordionItem title="Khối Tròn Xoay" icon={<Database size={20} />}>
          <p>Được tạo ra khi quay một hình phẳng quanh một trục cố định. Ứng dụng hỗ trợ mô phỏng Khối Cầu và Khối Nón.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
            <FormulaBlock title="Thể tích Khối Cầu" math={<>V = <sup>4</sup>&frasl;<sub>3</sub> &pi; R<sup>3</sup></>} />
            <FormulaBlock title="Diện tích Mặt Cầu" math={<>S = 4 &pi; R<sup>2</sup></>} />
            <FormulaBlock title="Thể tích Khối Nón" math={<>V = <sup>1</sup>&frasl;<sub>3</sub> &pi; R<sup>2</sup> h</>} />
          </div>
        </AccordionItem>

        <AccordionItem title="Bài Toán Thiết Diện & Thuật Toán Cắt" icon={<Scissors size={20} />}>
          <p>Thiết diện (mặt cắt) là đa giác tạo bởi giao tuyến của một mặt phẳng với các mặt của khối đa diện.</p>
          <p><b>Cơ sở thuật toán trong ứng dụng:</b> Web sử dụng biến thể của thuật toán <code>Sutherland-Hodgman</code>. Thuật toán hoạt động bằng cách lấy đa giác gốc và lần lượt "cắt bỏ" đi các phần nằm ở nửa không gian âm (negative half-space) so với mặt phẳng cắt $Ax + By + Cz + D = 0$. Các giao điểm mới được tính bằng phương pháp nội suy tuyến tính (Linear Interpolation).</p>
        </AccordionItem>


        {/* CHƯƠNG 2 */}
        <div style={{ marginTop: '3rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#ff7b72', margin: 0 }}>Chương II: Giải Tích & Vẽ Đồ Thị (Graphing)</h3>
        </div>

        <AccordionItem title="Hàm Tường Minh và Hàm Ẩn" icon={<Activity size={20} />}>
          <p>Ứng dụng đồ thị của chúng ta hỗ trợ 2 loại phương trình toán học cực mạnh:</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.8rem' }}><b>Hàm Tường Minh (Explicit):</b> Có dạng <code>y = f(x)</code> (VD: <code>y = sin(x)</code>). Hệ thống tính toán dễ dàng bằng cách quét x từ trái sang phải để lấy y tương ứng.</li>
            <li><b>Phương Trình Hàm Ẩn (Implicit):</b> Có dạng <code>F(x, y) = 0</code> (VD: <code>x² + y² = 25</code>). Để vẽ được đường cong này (như hình trái tim hay đường tròn), hệ thống sử dụng thuật toán <b>Adaptive Quadtree Subdivision (Phân rã lưới tương thích)</b>. Không gian được chia thành các ô vuông nhỏ; nếu đường cong đi qua ô nào, ô đó tiếp tục bị chia nhỏ làm 4 để vẽ các đường nét siêu mịn không bị gãy góc (như tính năng bạn đang trải nghiệm).</li>
          </ul>
        </AccordionItem>

        <AccordionItem title="Đạo Hàm & Tiếp Tuyến" icon={<PenTool size={20} />}>
          <p>Trong Tab Đồ Thị, khi bạn di chuột dọc theo hàm tường minh, một đường chấm chấm và một chấm tròn sẽ đi theo. Đó chính là <b>Tiếp Tuyến</b> của đồ thị.</p>
          <p>Ý nghĩa hình học của đạo hàm: Đạo hàm của hàm số <code>y = f(x)</code> tại điểm <code>x₀</code> chính là <b>Hệ số góc k</b> của tiếp tuyến tại điểm đó.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
            <FormulaBlock title="Hệ số góc" math={<>k = f'(x₀)</>} />
            <FormulaBlock title="Phương trình Tiếp tuyến" math={<>y = k &middot; (x - x₀) + y₀</>} />
          </div>
          <p style={{ marginTop: '1rem' }}>Hệ thống liên tục tính đạo hàm động tại thời gian thực (real-time) thông qua thư viện MathJS để vẽ đường tiếp tuyến đi theo con trỏ chuột của bạn!</p>
        </AccordionItem>

      </div>
    </div>
  );
};

export default TheoryPanel;
