import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, typography, touch, radius } from '../tokens';

interface EmergencyButtonProps {
  label: string;
  onPress: () => void;
  variant: 'danger' | 'warning' | 'primary';
  size?: 'standard' | 'emergency';
  disabled?: boolean;
  loading?: boolean;
}

const VARIANT_COLORS = {
  danger:  { bg: colors.action.danger,   active: colors.action.danger_hover },
  warning: { bg: colors.action.warning,  active: colors.action.primary },
  primary: { bg: colors.action.primary,  active: colors.action.primary_hover },
};

export function EmergencyButton({
  label,
  onPress,
  variant,
  size = 'standard',
  disabled = false,
  loading = false,
}: EmergencyButtonProps) {
  const height = size === 'emergency' ? touch.emergency : touch.standard;
  const variantColor = VARIANT_COLORS[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? colors.text.disabled : variantColor.bg,
          height,
          minHeight: touch.min,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.primary} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            {
              fontSize: size === 'emergency' ? typography.size.lg : typography.size.md,
              color: disabled ? colors.text.secondary : colors.text.primary,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: typography.family.display,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
