import { StyleSheet } from 'react-native';
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4f7f5' }, content: { padding: 22, gap: 16 },
  title: { fontSize: 29, fontWeight: '700', color: '#163531' }, subtitle: { fontSize: 17, color: '#49695b' },
  card: { padding: 20, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#dce6e0', gap: 10 },
  projectName: { fontSize: 19, fontWeight: '600', color: '#173e35' }, text: { fontSize: 16, color: '#38564a', lineHeight: 23 },
  input: { padding: 14, borderWidth: 1, borderColor: '#b8ccc3', borderRadius: 8, fontSize: 16, backgroundColor: '#fff' },
  banner: { backgroundColor: '#e3eee5', padding: 14, borderRadius: 8 }, error: { color: '#a33232', fontSize: 15 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, small: { fontSize: 13, color: '#647a70', lineHeight: 19 },
});
