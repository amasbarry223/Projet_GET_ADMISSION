import NotFound from "@/app/not-found";

export const metadata = {
  title: "Page introuvable — GET Admission",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFoundPage() {
  return <NotFound />;
}
