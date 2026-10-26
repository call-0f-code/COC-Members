const COLORS = ['#F2B544', '#F5E6D3', '#2C1810', '#7A9E7E', '#E98A6B'];

// Hand-placed along the top and bottom edges so pieces stay clear of the text.
// x/y are percentages of the container, rotate is degrees, size is pixels.
const PIECES = [
  { x: 3, y: 8, rotate: 18, size: 10, shape: 'square' },
  { x: 14, y: 88, rotate: -24, size: 14, shape: 'bar' },
  { x: 27, y: 6, rotate: 40, size: 8, shape: 'dot' },
  { x: 38, y: 90, rotate: 12, size: 10, shape: 'triangle' },
  { x: 50, y: 5, rotate: -12, size: 9, shape: 'square' },
  { x: 61, y: 86, rotate: 30, size: 12, shape: 'bar' },
  { x: 72, y: 7, rotate: -35, size: 10, shape: 'triangle' },
  { x: 82, y: 90, rotate: 8, size: 8, shape: 'dot' },
  { x: 92, y: 6, rotate: 22, size: 12, shape: 'square' },
  { x: 97, y: 84, rotate: -18, size: 10, shape: 'bar' },
];

function Piece({ shape, size, color }) {
  if (shape === 'dot') {
    return <span className="block rounded-full border-2 border-black" style={{ width: size, height: size, background: color }} />;
  }
  if (shape === 'triangle') {
    return (
      <svg width={size * 1.4} height={size * 1.4} viewBox="0 0 10 10" className="block overflow-visible">
        <path d="M5 0.8 L9.4 9.2 L0.6 9.2 Z" fill={color} stroke="#000" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  const isBar = shape === 'bar';
  return <span className="block border-2 border-black" style={{ width: isBar ? size * 0.45 : size, height: isBar ? size * 1.6 : size, background: color }} />;
}

/** Brutalist confetti scattered over a coloured surface. Floats gently unless reduced motion is on. */
export default function Confetti() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className="absolute bday-float"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            '--bday-rotate': `${piece.rotate}deg`,
            animationDelay: `${index * -0.45}s`,
          }}
        >
          <Piece shape={piece.shape} size={piece.size} color={COLORS[index % COLORS.length]} />
        </span>
      ))}
    </span>
  );
}
