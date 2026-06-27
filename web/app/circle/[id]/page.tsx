import { CircleDetail } from "@/components/circle/CircleDetail";

export default async function CirclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CircleDetail circleId={id} />;
}
