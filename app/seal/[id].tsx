import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import type Svg from 'react-native-svg';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Panel, Skeleton, StormyCheer, Text } from '@/core/ui';
import { useStormReport } from '@/features/storms/hooks/useStormLog';
import { sealData } from '@/features/storms/seal/sealData';
import {
  SEAL_EXPORT_DP,
  SEAL_EXPORT_DP_HEIGHT,
  canShareSeal,
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
 * Three templates over one report, a live preview, and one way off the
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
  const [busy, setBusy] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  /**
   * One button, not two -- and this decides which one it is.
   *
   * Sharing is preferred wherever it exists, because the share sheet already
   * contains "Save Image" and so covers both jobs, while the direct save does
   * not cover sharing and needs a photo-library permission that on iOS is
   * where the save was failing outright. Where sharing does not exist (a
   * desktop browser) the same button downloads, which is that platform's save.
   */
  const [canShare, setCanShare] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void canShareSeal().then((available) => {
      if (alive) setCanShare(available);
    });
    return () => {
      alive = false;
    };
  }, []);

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

  async function run() {
    if (!data) return;
    setBusy(true);

    const written = await writeSeal(exportRef.current, fileName);
    if (!written.ok) {
      setBusy(false);
      Alert.alert('The seal could not be made', written.error.message);
      return;
    }

    /*
     * Share first, save as the fallback -- and the fallback is taken without
     * asking. A chaser who pressed this wants the seal off the screen; being
     * told that sharing is unavailable and handed a second button to press is
     * the app making its own plumbing someone else's problem.
     */
    let result = canShare === false
      ? await saveSealToLibrary(written.value, fileName)
      : await shareSeal(written.value, fileName);

    if (!result.ok && canShare !== false) {
      result = await saveSealToLibrary(written.value, fileName);
    }

    setBusy(false);

    if (!result.ok) {
      Alert.alert('Not saved', result.error.message);
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
        title={canShare === false ? 'Save the seal' : 'Share or save'}
        loading={busy}
        disabled={busy}
        onPress={() => void run()}
      />
      <Text variant="label" tone="muted" style={{ marginTop: 8, textAlign: 'center' }}>
        {canShare === false
          ? 'The seal downloads as a PNG.'
          : 'The share sheet can save it to your photos too.'}
      </Text>

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
