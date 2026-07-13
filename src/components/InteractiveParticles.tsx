"use client";

import { useEffect, useRef } from "react";

export default function InteractiveParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    // マウスの座標と反応する半径
    let mouse = {
      x: -1000,
      y: -1000,
      radius: 90, // 120の0.75倍に変更
      isPressed: false
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseOut = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.isPressed = false;
    };

    const handleMouseDown = () => {
      mouse.isPressed = true;
    };

    const handleMouseUp = () => {
      mouse.isPressed = false;
    };

    const handleClick = (e: MouseEvent) => {
      const clickX = e.clientX;
      const clickY = e.clientY;
      const burstRadius = 250; // 弾ける範囲
      
      particles.forEach(p => {
        const dx = p.x - clickX;
        const dy = p.y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < burstRadius && dist > 0) {
          const force = (burstRadius - dist) / burstRadius;
          p.vx += (dx / dist) * force * 50 * (Math.random() + 0.5);
          p.vy += (dy / dist) * force * 50 * (Math.random() + 0.5);
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("click", handleClick);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    class Particle {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      vx: number;
      vy: number;
      size: number;
      density: number;
      color: string;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.vx = 0;
        this.vy = 0;
        this.size = 1.5; // 点のサイズを均一に
        this.density = (Math.random() * 20) + 5;
        this.color = "rgba(255, 255, 255, 0.4)"; // 数が増えるため透明度を少し下げる
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      update() {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        
        const maxDistance = mouse.isPressed ? mouse.radius * 3 : mouse.radius;
        let force = (maxDistance - distance) / maxDistance;
        if (force < 0) force = 0;

        const directionX = forceDirectionX * force * this.density;
        const directionY = forceDirectionY * force * this.density;

        const dxBase = this.x - this.baseX;
        const dyBase = this.y - this.baseY;
        const distFromBase = Math.sqrt(dxBase * dxBase + dyBase * dyBase);

        if (mouse.isPressed) {
          if (distance < maxDistance) {
            // 長押し：カーソルに集まる（吸い寄せ効果）
            if (distance > 2) {
              this.x += directionX * 0.8;
              this.y += directionY * 0.8;
            }
          } else {
            // 範囲外のものは元の場所へ戻る
            this.x -= dxBase / 20;
            this.y -= dyBase / 20;
          }
        } else {
          // 常に元の場所へ戻る力を適用
          this.x -= dxBase / 20;
          this.y -= dyBase / 20;

          if (distance < maxDistance) {
            // 通常時：カーソルから逃げるように動く
            // 定位置から大きく離れている場合（長押し解除直後など）は逃げる力を弱め、確実に帰還させる
            const evadeFactor = Math.max(0, 1 - (distFromBase / 100));
            this.x -= directionX * 2 * evadeFactor; 
            this.y -= directionY * 2 * evadeFactor;
          }
        }

        // クリックで弾けるアニメーションの適用
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.85; // 摩擦で減速
        this.vy *= 0.85;
      }
    }

    const init = () => {
      particles = [];
      const spacing = 22; // 22px間隔で均等配置（数を増やす）
      
      const cols = Math.floor(canvas.width / spacing);
      const rows = Math.floor(canvas.height / spacing);
      
      const offsetX = (canvas.width - (cols * spacing)) / 2;
      const offsetY = (canvas.height - (rows * spacing)) / 2;

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = offsetX + i * spacing;
          const y = offsetY + j * spacing;
          particles.push(new Particle(x, y));
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);
    
    resize();
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
    />
  );
}
