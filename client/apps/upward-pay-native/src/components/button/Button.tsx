import { LinearGradient } from 'expo-linear-gradient'
import { type ReactNode } from 'react'
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native'

import { BodyText, CaptionText, LabelText, LeadText } from '@/components/text'
import { useResponsive } from '@/hooks/useResponsive'
import { clayShadow, useAppTheme, type ThemeColorName } from '@/theme'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'tight' | 'pay'
type LabelRole = 'caption' | 'label' | 'body' | 'lead'

const sizeStyles: Record<
  ButtonSize,
  {
    label: LabelRole
    paddingVertical: number
    paddingHorizontal: number
    minHeight: number
    radius: 'md' | 'lg'
  }
> = {
  tight: {
    label: 'caption',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    radius: 'md',
  },
  sm: { label: 'label', paddingVertical: 10, paddingHorizontal: 20, minHeight: 44, radius: 'md' },
  md: { label: 'body', paddingVertical: 14, paddingHorizontal: 28, minHeight: 48, radius: 'md' },
  lg: { label: 'lead', paddingVertical: 16, paddingHorizontal: 28, minHeight: 52, radius: 'lg' },
  pay: { label: 'lead', paddingVertical: 16, paddingHorizontal: 28, minHeight: 56, radius: 'lg' },
}

export type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  pill?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  pill = false,
  onPress,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors, radius } = useAppTheme()
  const { isCompact } = useResponsive()
  const metrics = sizeStyles[size]
  const isInactive = disabled || loading
  const paddingHorizontal = isCompact
    ? Math.max(12, metrics.paddingHorizontal - 8)
    : metrics.paddingHorizontal
  const borderRadius = pill ? radius.full : radius[metrics.radius]
  const labelColor = labelColorFor(variant)
  const indicatorColor = variant === 'primary' || variant === 'danger' ? colors.white : colors.text

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
      }
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          width: fullWidth ? '100%' : undefined,
          borderRadius,
          opacity: isInactive ? 0.5 : 1,
          transform: [{ scale: pressed && !isInactive ? 0.97 : 1 }],
          ...(variant === 'primary' ? clayShadow : null),
        },
        style,
      ]}
    >
      {({ pressed }) => {
        const frameStyle: ViewStyle = {
          minHeight: metrics.minHeight,
          paddingVertical: metrics.paddingVertical,
          paddingHorizontal,
          borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }

        const content = (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? <ActivityIndicator color={indicatorColor} /> : null}
            {loading ? null : (
              <ButtonLabel
                role={metrics.label}
                color={pressed ? pressedLabelColor(variant, labelColor) : labelColor}
              >
                {children}
              </ButtonLabel>
            )}
          </View>
        )

        if (variant === 'primary') {
          const gradientColors = pressed
            ? ([colors.primaryGradientPressedStart, colors.primaryGradientPressedEnd] as const)
            : ([colors.primaryGradientStart, colors.primaryGradientEnd] as const)

          return (
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[frameStyle, { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }]}
            >
              {content}
            </LinearGradient>
          )
        }

        return <View style={[frameStyle, frameFor(variant, pressed, colors)]}>{content}</View>
      }}
    </Pressable>
  )
}

function ButtonLabel({
  role,
  color,
  children,
}: {
  role: LabelRole
  color: ThemeColorName
  children: ReactNode
}) {
  if (typeof children !== 'string' && typeof children !== 'number') {
    return <>{children}</>
  }

  const text = String(children)
  const shared = {
    color,
    weight: 'semibold' as const,
    align: 'center' as const,
    numberOfLines: 1 as const,
  }
  if (role === 'caption') return <CaptionText {...shared}>{text}</CaptionText>
  if (role === 'label') return <LabelText {...shared}>{text}</LabelText>
  if (role === 'lead') return <LeadText {...shared}>{text}</LeadText>
  return <BodyText {...shared}>{text}</BodyText>
}

function labelColorFor(variant: ButtonVariant): ThemeColorName {
  if (variant === 'primary' || variant === 'danger') return 'white'
  if (variant === 'ghost') return 'textSecondary'
  return 'text'
}

function pressedLabelColor(variant: ButtonVariant, color: ThemeColorName): ThemeColorName {
  if (variant === 'outline') return 'clay'
  return color
}

function frameFor(
  variant: Exclude<ButtonVariant, 'primary'>,
  pressed: boolean,
  colors: ReturnType<typeof useAppTheme>['colors'],
): ViewStyle {
  if (variant === 'danger') {
    return {
      backgroundColor: pressed ? colors.dangerPressed : colors.danger,
    }
  }

  if (variant === 'ghost') {
    return {
      backgroundColor: pressed ? colors.clayFaint : 'transparent',
    }
  }

  if (variant === 'outline') {
    return {
      backgroundColor: pressed ? colors.clayFaint : 'transparent',
      borderWidth: 1,
      borderColor: pressed ? colors.clay : colors.borderSolid,
    }
  }

  return {
    backgroundColor: pressed ? colors.surface2 : colors.surface,
    borderWidth: 1,
    borderColor: pressed ? colors.clay : colors.borderSolid,
  }
}
