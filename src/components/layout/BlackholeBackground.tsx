'use client';

import { useMemo, memo } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useIsClient } from '@/lib/hooks/useIsClient';

// 链 Logo 数据 - 只展示主要的 12 条链（减少动画数量）
const chainLogos = [
  { id: 1, src: '/logos/ethereum-eth-logo.png', name: 'Ethereum' },
  { id: 2, src: '/logos/arbitrum-arb-logo.png', name: 'Arbitrum' },
  { id: 3, src: '/logos/optimism-ethereum-op-logo.png', name: 'OP Mainnet' },
  { id: 4, src: '/logos/base.webp', name: 'Base' },
  { id: 5, src: '/logos/solana.png', name: 'Solana' },
  { id: 6, src: '/logos/polygon-matic-logo.png', name: 'Polygon' },
  { id: 7, src: '/logos/avalanche-avax-logo.png', name: 'Avalanche' },
  { id: 8, src: '/logos/linea.png', name: 'Linea' },
  { id: 9, src: '/logos/Sonic.png', name: 'Sonic' },
  { id: 11, src: '/logos/usd-coin-usdc-logo.png', name: 'USDC' },
  { id: 12, src: '/logos/worldcoin-org-wld-logo.png', name: 'World Chain' },
];

// 椭圆轨道配置
interface OrbitConfig {
  radiusX: number;
  radiusY: number;
  duration: number;
  planets: typeof chainLogos;
  direction: 1 | -1;
  startAngle: number;
}

// 创建轨道配置 - 3 条轨道，12 个链 logo（性能优化）
const createOrbits = (): OrbitConfig[] => [
  {
    radiusX: 260,
    radiusY: 300,
    duration: 25,
    planets: chainLogos.slice(0, 4),   // 4 个行星
    direction: 1,
    startAngle: 0,
  },
  {
    radiusX: 340,
    radiusY: 390,
    duration: 35,
    planets: chainLogos.slice(4, 8),   // 4 个行星
    direction: -1,
    startAngle: 22,
  },
  {
    radiusX: 420,
    radiusY: 480,
    duration: 48,
    planets: chainLogos.slice(8, 12),  // 4 个行星
    direction: 1,
    startAngle: 45,
  },
];

// 单个行星组件 - 使用双层嵌套 CSS 动画实现椭圆轨道
// 外层: X 方向 cos 运动，内层: Y 方向 sin 运动
// 性能优化：移除 blur 效果，使用 memo 避免重渲染
const Planet = memo(({
  logo,
  radiusX,
  radiusY,
  duration,
  direction,
  startAngle,
  index,
  totalPlanets,
  glowColor,
}: {
  logo: typeof chainLogos[0];
  radiusX: number;
  radiusY: number;
  duration: number;
  direction: 1 | -1;
  startAngle: number;
  index: number;
  totalPlanets: number;
  glowColor: string;
}) => {
  // 计算每个行星的起始位置（均匀分布在轨道上）
  const baseAngle = (360 / totalPlanets) * index + startAngle;
  // 通过 animation-delay 负值来设置起始位置
  const animationDelay = -(baseAngle / 360) * duration;
  
  const xClass = direction === -1 ? 'planet-orbit-x-reverse' : 'planet-orbit-x';
  const yClass = direction === -1 ? 'planet-orbit-y-reverse' : 'planet-orbit-y';
  
  return (
    // 外层：X 方向运动
    <div
      className={xClass}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        '--rx': `${radiusX}px`,
        '--duration': `${duration}s`,
        animationDelay: `${animationDelay}s`,
      } as React.CSSProperties}
    >
      {/* 内层：Y 方向运动 */}
      <div
        className={yClass}
        style={{
          '--ry': `${radiusY}px`,
          '--duration': `${duration}s`,
          animationDelay: `${animationDelay}s`,
        } as React.CSSProperties}
      >
        {/* 发光效果 - 使用 box-shadow 替代 blur（性能更好） */}
        <div
          className="absolute rounded-full planet-glow"
          style={{
            width: '40px',
            height: '40px',
            background: glowColor,
            transform: 'translate(-50%, -50%)',
            left: '50%',
            top: '50%',
            boxShadow: `0 0 20px 8px ${glowColor}`,
          }}
        />
        
        {/* 行星图标 - 移除 backdrop-blur */}
        <div
          className="relative w-10 h-10 md:w-11 md:h-11 rounded-xl overflow-hidden bg-card border border-border/50 shadow-md flex items-center justify-center planet-icon"
          style={{
            transform: 'translate(-50%, -50%)',
            '--glow-color': glowColor,
          } as React.CSSProperties}
        >
          <Image
            src={logo.src}
            alt={logo.name}
            width={32}
            height={32}
            className="w-6 h-6 md:w-7 md:h-7 object-contain"
            loading="eager"
          />
        </div>
      </div>
    </div>
  );
});

// 椭圆轨道环组件 - 静态渲染，无动画
const OrbitRing = memo(({
  radiusX,
  radiusY,
  index,
  primaryColor,
}: {
  radiusX: number;
  radiusY: number;
  index: number;
  primaryColor: string;
}) => {
  const opacity = 0.08 + (0.04 * (3 - index));
  
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: `${radiusX * 2}px`,
        height: `${radiusY * 2}px`,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        border: `1px dashed ${primaryColor}`,
        opacity,
      }}
    />
  );
});

// 中心光晕效果 - 静态渲染
const CenterGlow = memo(({ primaryColor }: { primaryColor: string }) => {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '900px',
        height: '1100px',
        background: `radial-gradient(ellipse, ${primaryColor}08 0%, ${primaryColor}03 40%, transparent 70%)`,
        borderRadius: '50%',
      }}
    />
  );
});

// 生成星星数据（减少数量以提升性能）
const generateStars = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: 1 + Math.random() * 1.5,
    left: Math.random() * 100,
    top: Math.random() * 100,
  }));
};

// 给 Planet 添加 displayName
Planet.displayName = 'Planet';
OrbitRing.displayName = 'OrbitRing';
CenterGlow.displayName = 'CenterGlow';

export function BlackholeBackground() {
  const { theme } = useTheme();
  const mounted = useIsClient();
  
  // 只计算一次轨道和星星
  const orbits = useMemo(() => createOrbits(), []);
  const stars = useMemo(() => generateStars(), []);
  
  // 主题相关颜色
  const primaryColor = theme === 'dark' ? '#f59e0b' : '#84cc16';
  const glowColor = theme === 'dark' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(132, 204, 22, 0.4)';
  
  if (!mounted) return null;
  
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      style={{
        // 使用 content-visibility 优化渲染
        contentVisibility: 'auto',
        containIntrinsicSize: '100vw 100vh',
      }}
    >
      {/* 中心光晕效果 */}
      <CenterGlow primaryColor={primaryColor} />
      
      {/* 椭圆轨道环 */}
      {orbits.map((orbit, index) => (
        <OrbitRing
          key={`orbit-ring-${index}`}
          radiusX={orbit.radiusX}
          radiusY={orbit.radiusY}
          index={index}
          primaryColor={primaryColor}
        />
      ))}
      
      {/* 行星容器 - 使用 GPU 加速 */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: '1px',
          height: '1px',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        {orbits.map((orbit, orbitIndex) => (
          <div key={`orbit-${orbitIndex}`}>
            {orbit.planets.map((planet, planetIndex) => (
              <Planet
                key={planet.id}
                logo={planet}
                radiusX={orbit.radiusX}
                radiusY={orbit.radiusY}
                duration={orbit.duration}
                direction={orbit.direction}
                startAngle={orbit.startAngle}
                index={planetIndex}
                totalPlanets={orbit.planets.length}
                glowColor={glowColor}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* 星空背景 - 静态星星，无动画 */}
      <div className="absolute inset-0 overflow-hidden">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-foreground/20"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              left: `${star.left}%`,
              top: `${star.top}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
