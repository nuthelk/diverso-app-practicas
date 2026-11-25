export default function Skeleton({ clase = 'h-24 rounded-hoja' }: { clase?: string }) {
  return <div className={`pulso bg-niebla-2 ${clase}`}></div>;
}
