import { View } from 'react-native';

import { Panel, Text } from '@/core/ui';

import type { ChaseIndex, ChaseLevel } from '../model/types';

const LEVEL_COLOR: Record<ChaseLevel, string> = {
  dormant: 'bg-ink-400',
  unsettled: 'bg-radar',
  active: 'bg-lightning',
  severe: 'bg-supercell',
  extreme: 'bg-supercell',
};

export function ChaseIndexPanel({ chase }: { chase: ChaseIndex }) {
  return (
    <Panel label="Chase index" className="mb-3">
      <View className="flex-row items-end gap-3">
        <Text className="font-monoBold text-[44px] leading-[46px] text-ink-800 dark:text-bone-50">
          {chase.score}
        </Text>
        <Text variant="caption" className="mb-2 flex-1">
          {chase.headline}
        </Text>
      </View>

      {/* Segmented meter: five blocks fill left to right with the score. */}
      <View className="mt-3 flex-row gap-1">
        {Array.from({ length: 20 }).map((_, index) => {
          const filled = chase.score >= (index + 1) * 5;
          return (
            <View
              key={index}
              className={`h-2 flex-1 rounded-sm ${filled ? LEVEL_COLOR[chase.level] : 'bg-bone-200 dark:bg-ink-600'}`}
            />
          );
        })}
      </View>

      {chase.drivers.length > 0 ? (
        <View className="mt-4 gap-1">
          {chase.drivers.slice(0, 3).map((driver) => (
            <Text key={driver} variant="caption">
              {`\u2022  ${driver}`}
            </Text>
          ))}
        </View>
      ) : (
        <Text variant="caption" className="mt-4">
          No convective signal in the current observation.
        </Text>
      )}
    </Panel>
  );
}
