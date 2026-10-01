import { useParams } from "react-router";

export default function BookPage() {
  const { olId } = useParams();
  return <p>Book page for {olId} (placeholder)</p>;
}