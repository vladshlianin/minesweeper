type Particle = {
  // Position properties
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  // Visual properties
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  // Physics properties
  airResistance: number;
};

// Configuration constants
const CONFETTI_CONFIG = {
  colors: ['#f87171', '#facc15', '#4ade80', '#38bdf8', '#a78bfa'],
  particlesCount: 195,
  physics: {
    minSpeed: 6,
    maxSpeed: 10,
    minSize: 5,
    maxSize: 10,
    baseAirResistance: 0.98,
    airResistanceVariation: 0.015,
    maxRotationSpeed: 6,
    angleDeviation: 8,
    minUpwardVelocity: 8,
    maxUpwardVelocity: 18,
  },
  animation: {
    targetFPS: 60,
    canvasClassName: 'confetti',
  },
} as const;

/**
 * Picks a random color from config
 * @returns Random color
 */
const getRandomColor = () => {
  const { colors } = CONFETTI_CONFIG;
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Generates a random angle variation around a base angle
 * @param baseAngle - The base angle in degrees
 * @param deviation - Maximum deviation from base angle in degrees
 * @returns A varied angle in degrees
 */
const getAngleVariation = (baseAngle: number, deviation: number) => {
  return baseAngle - deviation * 2 + Math.random() * deviation * 2;
};

/**
 * Gets an existing canvas element or creates a new one
 * @param id - Unique identifier for the canvas
 * @returns Canvas element
 */
const getCanvas = (id: number): HTMLCanvasElement => {
  const fromDom = document.getElementById(`confetti-${id}`);
  if (fromDom) return fromDom as HTMLCanvasElement;
  const el = document.createElement('canvas');
  el.id = `confetti-${id}`;
  el.className = CONFETTI_CONFIG.animation.canvasClassName;
  document.body.appendChild(el);
  return el;
};

/**
 * Removes a canvas element from the DOM
 * @param id - Unique identifier of the canvas to remove
 */
const removeCanvasFromDom = (id: number) => {
  const canvas = document.getElementById(`confetti-${id}`);
  if (canvas) document.body.removeChild(canvas);
};

/**
 * Generates a collection of particles grouped by color
 * @param startX - Starting X position for particles
 * @param startY - Starting Y position for particles
 * @param initialSpreadX - Horizontal spread range for initial positions
 * @param initialSpreadY - Vertical spread range for initial positions
 * @param angleInDegrees - Base angle in degrees for particle movement
 * @returns Map of particles grouped by color
 */
const getParticles = (
  // Start positions
  startX: number,
  startY: number,
  initialSpreadX: number,
  initialSpreadY: number,
  angleInDegrees: number,
): Map<string, Particle[]> => {
  const { particlesCount, colors, physics } = CONFETTI_CONFIG;
  const particles: Particle[] = [];
  for (let i = 0; i < particlesCount; i++) {
    const variatedAngle = getAngleVariation(angleInDegrees, 8);
    const speed = Math.random() * (physics.maxSpeed - physics.minSpeed) + physics.minSpeed;

    // const initialX = startX + Math.random() * initialSpreadX;
    particles.push({
      // Initial positions
      x: startX + Math.random() * initialSpreadX,
      y: startY + Math.random() * initialSpreadY,

      // Velocity
      velocityX: Math.cos(variatedAngle) * speed,
      velocityY:
        Math.sin(variatedAngle) * speed - Math.random() * physics.maxUpwardVelocity - physics.minUpwardVelocity,

      // VIsual properties
      color: getRandomColor(),
      rotation: Math.random() * 360,

      // 0.5 to include both negative and positive values
      // Leading to confetti spinning in both directions
      rotationSpeed: (Math.random() - 0.5) * physics.maxRotationSpeed,
      // Generate size from minSize to maxSize
      size: Math.random() * (physics.maxSize - physics.minSize) + physics.minSize,

      // Add air resistance property
      airResistance: physics.baseAirResistance + Math.random() * physics.airResistanceVariation, // Slight variation per particle
    });
  }

  // Group particles by color for efficient rendering
  const byColor = new Map<string, Particle[]>();
  for (const color of colors) {
    byColor.set(color, []);
  }
  for (const particle of particles) {
    const prev = byColor.get(particle.color);
    prev?.push(particle);
  }
  return byColor;
};

/**
 * Animates confetti particles on a canvas
 * @param id - Unique identifier for the animation instance
 * @param duration - Animation duration in milliseconds
 * @param particles - Map of particles grouped by color
 * @param onFinish - Callback function called when animation completes
 */
const animate = (id: number, duration: number, particles: Map<string, Particle[]>, onFinish: (id: number) => void) => {
  const canvas = getCanvas(id);
  if (canvas.getContext) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas 2D context not available');
      onFinish(id);
      return;
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let animationStart: DOMHighResTimeStamp | null = null;

    // Calculate rates based on duration
    // Assuming 60 FPS, total frames = duration / (1000/60) = duration * 0.06
    const totalFrames = duration * (CONFETTI_CONFIG.animation.targetFPS / 1000);

    // For natural physics, gravity should accelerate particles downward
    // Scale based on canvas height and duration
    const gravityRate = canvas.height / totalFrames ** 2;

    const animateFrame = (timestamp: DOMHighResTimeStamp) => {
      if (!animationStart) {
        animationStart = timestamp;
      }
      const elapsed = timestamp - animationStart;
      // Check if animation duration has been reached
      if (elapsed >= duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onFinish(id);
        return;
      }

      // Calculate fade-out opacity
      // Linearly decrease opacity from 1 to 0
      const opacity = Math.max(1 - elapsed / duration, 0);

      // Clear canvas for new frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render particles grouped by color for better performance
      for (const [color, batch] of particles.entries()) {
        ctx.fillStyle = color;
        for (const p of batch) {
          // Apply air resistance for natural deceleration
          p.velocityX *= p.airResistance;
          p.velocityY = p.velocityY * p.airResistance + gravityRate;

          // Update position
          p.x += p.velocityX;
          p.y += p.velocityY;

          // Update rotation
          p.rotation += p.rotationSpeed;

          // Draw particle
          ctx.save();
          ctx.globalAlpha = Math.max(opacity, 0);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }
      requestAnimationFrame(animateFrame);
    };
    requestAnimationFrame(animateFrame);
  }
};

/**
 * Creates and manages multiple confetti animations
 * @param repeat - Number of confetti bursts to create
 * @param repeatDelay - Delay between bursts in milliseconds
 * @param duration - Duration of each burst animation in milliseconds
 */
export const showConfetti = (repeat: number, repeatDelay: number, duration: number) => {
  const initialSpreadX = 20;
  const initialSpreadY = 50;
  const edgeOffset = 50;

  const runIteration = (id: number) => {
    const particles: Map<string, Particle[]> = new Map();
    for (const color of CONFETTI_CONFIG.colors) {
      particles.set(color, []);
    }

    // Create particles from left side (shooting right and up)
    const leftParticles = getParticles(edgeOffset, window.innerHeight, initialSpreadX, initialSpreadY, 120);

    // Create particles from right side (shooting left and up)
    const rightParticles = getParticles(
      window.innerWidth - edgeOffset,
      window.innerHeight,
      initialSpreadX,
      initialSpreadY,
      60,
    );

    // Combine particles from both sides
    for (const color of CONFETTI_CONFIG.colors) {
      const left = leftParticles.get(color);
      const right = rightParticles.get(color);
      const prev = particles.get(color);
      if (left) prev?.push(...left);
      if (right) prev?.push(...right);
    }
    animate(id, duration, particles, removeCanvasFromDom);
  };

  // Run first iteration immediately
  runIteration(0);

  // And subsequent bursts with delay
  if (repeat > 1) {
    let count = 1;
    // And all subsequent within setInterval
    const interval = setInterval(() => {
      count++;
      if (count === repeat) {
        clearInterval(interval);
      }
      runIteration(count);
    }, repeatDelay);
  }
};
