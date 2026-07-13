import React, { useEffect, useRef } from 'react';

const ParticleCanvas = ({ currentTier, isSpeaking, audioLevel, theme = 'dark' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle system configuration
    const particles = [];
    const particleCount = 200;

    // Get color scheme based on threat tier and theme
    const getColorScheme = () => {
      const isLight = theme === 'light';
      if (currentTier === 'tier_3') {
        return {
          primary: '239, 68, 68', // Red-500
          secondary: '248, 113, 113', // Red-400
          bg: isLight ? 'rgba(254, 242, 242, 0.15)' : 'rgba(20, 0, 5, 0.1)'
        };
      }
      if (currentTier === 'tier_2') {
        return {
          primary: '249, 115, 22', // Orange-500
          secondary: 'fb923c', // Orange-400
          bg: isLight ? 'rgba(255, 247, 237, 0.15)' : 'rgba(20, 10, 0, 0.1)'
        };
      }
      return {
        primary: isLight ? '59, 130, 246' : '16, 185, 129', // Blue-500 / Emerald-500
        secondary: isLight ? '96, 165, 250' : '52, 211, 153', // Blue-400 / Emerald-400
        bg: isLight ? 'rgba(248, 250, 252, 0.2)' : 'rgba(0, 20, 10, 0.1)'
      };
    };

    // Get particle behavior based on tier
    const getParticleBehavior = () => {
      if (currentTier === 'tier_3') {
        return {
          speed: 3,
          connectionDistance: 80,
          sizeMultiplier: 1.5,
          chaosFactor: 2
        };
      }
      if (currentTier === 'tier_2') {
        return {
          speed: 2,
          connectionDistance: 100,
          sizeMultiplier: 1.2,
          chaosFactor: 1.5
        };
      }
      return {
        speed: 0.5,
        connectionDistance: 120,
        sizeMultiplier: 1,
        chaosFactor: 1
      };
    };

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.15,
        pulseOffset: Math.random() * Math.PI * 2,
        type: Math.random() > 0.8 ? 'special' : 'normal'
      });
    }

    const animate = () => {
      const colors = getColorScheme();
      const behavior = getParticleBehavior();
      
      // Adjust speed based on audio level when speaking
      const speedMultiplier = isSpeaking ? 1 + audioLevel * 2 : 1;
      
      // Clear with trail effect
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx * behavior.speed * speedMultiplier;
        particle.y += particle.vy * behavior.speed * speedMultiplier;

        // Add chaos for higher tiers
        if (behavior.chaosFactor > 1) {
          particle.vx += (Math.random() - 0.5) * 0.1 * behavior.chaosFactor;
          particle.vy += (Math.random() - 0.5) * 0.1 * behavior.chaosFactor;
          
          // Limit velocity
          const maxVel = 3 * behavior.chaosFactor;
          particle.vx = Math.max(-maxVel, Math.min(maxVel, particle.vx));
          particle.vy = Math.max(-maxVel, Math.min(maxVel, particle.vy));
        }

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Calculate pulse
        const pulse = Math.sin(Date.now() * 0.003 + particle.pulseOffset) * 0.3 + 0.7;
        const speakingPulse = isSpeaking ? 1 + audioLevel * 0.5 : 1;
        
        // Draw particle
        const size = particle.size * behavior.sizeMultiplier * pulse * speakingPulse;
        const opacity = particle.opacity * pulse * speakingPulse;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        
        if (particle.type === 'special') {
          ctx.fillStyle = `rgba(${colors.secondary}, ${opacity})`;
          ctx.shadowBlur = theme === 'dark' ? 10 : 0;
          ctx.shadowColor = `rgba(${colors.secondary}, 0.5)`;
        } else {
          ctx.fillStyle = `rgba(${colors.primary}, ${opacity})`;
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw connections between nearby particles
        particles.forEach((otherParticle, otherIndex) => {
          if (index === otherIndex) return;
          
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < behavior.connectionDistance) {
            const connectionOpacity = (1 - distance / behavior.connectionDistance) * 0.15 * pulse;
            
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(${colors.primary}, ${connectionOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      // Draw audio visualization when speaking
      if (isSpeaking && audioLevel > 0.1) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 50 + audioLevel * 100;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${getColorScheme().primary}, ${audioLevel * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw concentric rings
        for (let i = 1; i <= 3; i++) {
          const ringRadius = radius + i * 20 * audioLevel;
          ctx.beginPath();
          ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${getColorScheme().primary}, ${audioLevel * 0.2 / i})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [currentTier, isSpeaking, audioLevel, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default ParticleCanvas;
