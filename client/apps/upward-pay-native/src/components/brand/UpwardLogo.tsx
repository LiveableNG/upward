import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg'

type UpwardLogoProps = {
  size?: number
  color?: string
}

export function UpwardLogo({ size = 28, color = '#d97757' }: UpwardLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Rect x={7} y={15} width={10} height={17} rx={5} fill={color} />
      <Rect x={23} y={15} width={10} height={17} rx={5} fill={color} />
      <Path
        d="M12 30 Q12 37 20 37 Q28 37 28 30"
        stroke={color}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />
      <Polyline
        points="7,19 20,8 33,19"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={20} cy={5} r={3} fill="#22c55e" />
    </Svg>
  )
}
