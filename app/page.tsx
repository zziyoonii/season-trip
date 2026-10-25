import Planner from "@/components/Planner";
import { loadPageProps } from "@/lib/page-props";

// 여행경보는 서버에서 받아 하루 동안 캐시해요
export const revalidate = 86400;

export default async function Home() {
  return <Planner {...await loadPageProps()} />;
}
