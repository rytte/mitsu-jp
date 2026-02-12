import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { DEFAULT_AI_PROVIDER_CONFIG } from '../features/ai/constants';
import { loadAiProviderConfig, saveAiProviderConfig } from '../features/ai/storage';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function extractModelIds(payload: unknown) {
  const data = payload as {
    data?: Array<{ id?: string }>;
    models?: Array<{ id?: string }>;
  };
  const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
  const ids = list
    .map((item) => String(item?.id ?? '').trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  return Array.from(new Set(ids));
}

export default function AiSettingsScreen() {
  const topPadding = useScreenTopPadding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [providerLabel, setProviderLabel] = useState<string>(DEFAULT_AI_PROVIDER_CONFIG.provider_label);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(DEFAULT_AI_PROVIDER_CONFIG.api_base_url);
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>(DEFAULT_AI_PROVIDER_CONFIG.model);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [modelHint, setModelHint] = useState('');
  const [saveHint, setSaveHint] = useState('');
  const [saveHintType, setSaveHintType] = useState<'info' | 'success' | 'error'>('info');

  useEffect(() => {
    let active = true;
    (async () => {
      const config = await loadAiProviderConfig();
      if (!active) return;
      setProviderLabel(config.provider_label);
      setApiBaseUrl(config.api_base_url);
      setApiKey(config.api_key);
      setModel(config.model);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const canSave = useMemo(() => {
    return Boolean(providerLabel.trim() && normalizeBaseUrl(apiBaseUrl) && model.trim());
  }, [apiBaseUrl, model, providerLabel]);

  const handleSave = async () => {
    if (!canSave) {
      setSaveHintType('error');
      setSaveHint('保存失败：请完整填写 Provider 名称、Base URL 和 Model');
      Alert.alert('保存失败', '请完整填写 Provider 名称、Base URL 和 Model');
      return;
    }
    setSaving(true);
    setSaveHintType('info');
    setSaveHint('正在保存配置...');
    try {
      await saveAiProviderConfig({
        provider_id: DEFAULT_AI_PROVIDER_CONFIG.provider_id,
        provider_label: providerLabel.trim(),
        api_base_url: normalizeBaseUrl(apiBaseUrl),
        api_key: apiKey.trim(),
        model: model.trim(),
        updated_at: Date.now(),
      });
      setSaveHintType('success');
      setSaveHint('保存成功：AI 配置已更新');
      Alert.alert('已保存', 'AI 配置已更新');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSaveHintType('error');
      setSaveHint(`保存失败：${message}`);
      Alert.alert('保存失败', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleLoadModels = async () => {
    const baseUrl = normalizeBaseUrl(apiBaseUrl);
    const key = apiKey.trim();
    if (!baseUrl) {
      Alert.alert('无法拉取', '请先填写 API Base URL');
      return;
    }
    if (!key) {
      Alert.alert('无法拉取', '请先填写 API Key');
      return;
    }

    setLoadingModels(true);
    setModelHint('');
    try {
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`接口返回 ${response.status}：${errText || response.statusText}`);
      }

      const payload = (await response.json()) as unknown;
      const ids = extractModelIds(payload);
      if (!ids.length) {
        throw new Error('未解析到模型列表，请确认 Base URL 是否兼容 /models 接口');
      }

      setModelOptions(ids);
      if (!ids.includes(model.trim())) {
        setModel(ids[0]);
      }
      setModelHint(`已拉取 ${ids.length} 个模型，可点击下方标签快速选择`);
    } catch (error) {
      setModelOptions([]);
      setModelHint(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingModels(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loading, { paddingTop: topPadding }]}>
        <Text style={styles.loadingText}>加载 AI 配置中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Provider</Text>
        <Text style={styles.tip}>当前使用 Responses 接口，后续可扩展更多 Provider。</Text>
        <TextInput
          value={providerLabel}
          onChangeText={setProviderLabel}
          placeholder="例如 OpenAI Compatible"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Base URL</Text>
        <TextInput
          value={apiBaseUrl}
          onChangeText={setApiBaseUrl}
          placeholder="https://api.openai.com/v1"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Key</Text>
        <TextInput
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="sk-..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model</Text>
        <TextInput
          value={model}
          onChangeText={setModel}
          placeholder="gpt-4.1-mini"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <PrimaryButton
          title={loadingModels ? '拉取中...' : '拉取模型'}
          onPress={handleLoadModels}
          disabled={loadingModels}
          style={styles.modelFetchBtn}
        />
        {modelHint ? <Text style={styles.modelHint}>{modelHint}</Text> : null}
        {modelOptions.length ? (
          <View style={styles.modelChipWrap}>
            {modelOptions.map((modelId) => {
              const active = modelId === model;
              return (
                <Pressable
                  key={modelId}
                  onPress={() => setModel(modelId)}
                  style={[styles.modelChip, active ? styles.modelChipActive : null]}
                >
                  <Text style={[styles.modelChipText, active ? styles.modelChipTextActive : null]}>{modelId}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <PrimaryButton title={saving ? '保存中...' : '保存配置'} onPress={handleSave} disabled={saving} />
      {saveHint ? (
        <Text
          style={[
            styles.saveHint,
            saveHintType === 'success' ? styles.saveHintSuccess : null,
            saveHintType === 'error' ? styles.saveHintError : null,
          ]}
        >
          {saveHint}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.m,
    paddingBottom: spacing.l,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.m,
  },
  loadingText: {
    color: colors.muted,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  tip: {
    color: colors.muted,
    marginBottom: spacing.s,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: '#fff',
    color: colors.text,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  modelFetchBtn: {
    marginTop: spacing.s,
  },
  modelHint: {
    marginTop: spacing.s,
    color: colors.muted,
    fontSize: 12,
  },
  modelChipWrap: {
    marginTop: spacing.s,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  modelChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  modelChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  modelChipText: {
    color: colors.muted,
    fontSize: 12,
  },
  modelChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  saveHint: {
    marginTop: spacing.s,
    color: colors.muted,
    fontSize: 12,
  },
  saveHintSuccess: {
    color: colors.success,
  },
  saveHintError: {
    color: colors.danger,
  },
});
