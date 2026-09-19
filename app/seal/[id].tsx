import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import type Svg from 'react-native-svg';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Panel, Skeleton, StormyCheer, Text } from '@/core/ui';
import { useStormReport } from '@/features/storms/hooks/useStormLog';
import { sealData } from '@/features/storms/seal/sealData';
import {
  SEAL_EXPORT_DP,
  SEAL_EXPORT_DP_HEIGHT,
  saveSealToLibrary,
  sealFileName,
  shareSeal,
  writeSeal,
} from '@/features/storms/seal/sealExport';
import { SealSvg } from '@/features/storms/seal/sealSvg';
import {
  SEAL_TEMPLATES,
  type SealTemplateId,
} from '@/features/storms/seal/sealTemplates';

/**
 * Stamp a storm.
 *
 * Three templates over one report, a live preview, and two ways off the
 * device. The preview and the exported file are the same component with a
 * different `width`, which is the whole reason the seal is drawn in viewBox
 * units: there is no second layout to keep in step, so what is posted is
 * exactly what was chosen.
 */
export default function SealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();

  const { data: report, isLoading, isError } = useStormReport(id);

  const [template, setTemplate] = useState<SealTemplateId>('field-card');
  const [busy, setBusy] = useState<null | 'save' | 'share'>(null);
  const [celebrating, setCelebrating] = useState(false);

  /**
   * The export mount, separate from the preview.
   *
   * Two Svg trees on purpose. `toDataURL` with no size options rasterises at
   * the MOUNTED size, so the file's resolution is set by how large this one
   * is laid out -- and the preview has to stay the size of the screen.
   */
  const exportRef = useRef<Svg>(null);

  const data = useMemo(
    () => (report ? sealData(report, template) : null),
    [report, template],
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 16 }}>
        <Skeleton height={420} />
      </View>
    );
  }

  if (isError || !report || !data) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
          padding: 24,
        }}
      >
        <Text variant="title" style={{ marginBottom: 8 }}>
          Report not found
        </Text>
        <Button title="Back to log" tone="secondary" onPress={() => router.replace('/log')} />
      </View>
    );
  }

  const previewWidth = Math.min(screenWidth - 32, 420);
  const fileName = sealFileName(data.serial, data.classification);

  async function run(action: 'save' | 'share') {
    if (!data) return;
    setBusy(action);

    const written = await writeSeal(exportRef.current, fileName);
    if (!written.ok) {
      setBusy(null);
      Alert.alert('The seal could not be made', written.error.message);
      return;
    }

    const result =
      action === 'save'
        ? await saveSealToLibrary(written.value)
        : await shareSeal(written.value);

    setBusy(null);

    if (!result.ok) {
      /*
       * A refused photo-library permission is not a dead end. Sharing needs
       * no permission at all, so the recovery is offered inline rather than
       * leaving the chaser with a message and nothing to press.
       */
      Alert.alert(
        'Not saved',
        result.error.message,
        action === 'save'
          ? [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Share instead', onPress: () => void run('share') },
            ]
          : [{ text: 'OK' }],
      );
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCelebrating(true);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      <Text variant="body" tone="muted" style={{ marginBottom: 12 }}>
        Three ways to print the same report. The seal is Field Card stock whichever
        theme you are wearing, so what you post looks the same to everyone.
      </Text>

      {/* The picker. Maps over the registry rather than listing three cards,
          so a fourth template is a row in a table. */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {SEAL_TEMPLATES.map((option) => {
          const selected = option.id === template;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label}. ${option.description}`}
              onPress={() => {
                setTemplate(option.id);
                void Haptics.selectionAsync();
              }}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 10,
                borderRadius: theme.radius.control,
                borderWidth: selected ? 3 : theme.borderWidth > 0 ? theme.borderWidth : 1,
                borderColor: selected ? theme.colors.accent : theme.colors.border,
                backgroundColor: selected ? theme.colors.surface : 'transparent',
              }}
            >
              <Text variant="label" color={selected ? theme.colors.text : theme.colors.textMuted}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <SealSvg
          data={data}
          template={template}
          photoUri={report.photoUri}
          width={previewWidth}
        />
      </View>

      <Panel label="What this prints" style={{ marginBottom: 16 }}>
        <Text variant="body">
          {SEAL_TEMPLATES.find((option) => option.id === template)?.description}
        </Text>
        {!data.hasConditions ? (
          <Text variant="label" tone="muted" style={{ marginTop: 8 }}>
            No conditions were captured with this report, so the instrument block is left
            off rather than printed as zeroes.
          </Text>
        ) : null}
        {data.filedFromLibrary ? (
          <Text variant="label" tone="muted" style={{ marginTop: 8 }}>
            This photo was imported, so the seal says so. An imported shot carries the
            conditions of the import, not of the storm.
          </Text>
        ) : null}
      </Panel>

      <Button
        title="Save to photos"
        loading={busy === 'save'}
        disabled={busy !== null}
        onPress={() => void run('save')}
        style={{ marginBottom: 8 }}
      />
      <Button
        title="Share"
        tone="secondary"
        loading={busy === 'share'}
        disabled={busy !== null}
        onPress={() => void run('share')}
      />

      {/*
        The export mount: full size, offscreen, never visible and never
        interactive. `toDataURL` reads the mounted size, so this is what makes
        the file 1080x1350 rather than a blurry copy of the preview above.
      */}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          left: -20000,
          top: 0,
          width: SEAL_EXPORT_DP,
          height: SEAL_EXPORT_DP_HEIGHT,
        }}
      >
        <SealSvg
          data={data}
          template={template}
          photoUri={report.photoUri}
          width={SEAL_EXPORT_DP}
          svgRef={exportRef}
        />
      </View>

      <StormyCheer active={celebrating} onDone={() => setCelebrating(false)} />
    </ScrollView>
  );
}
