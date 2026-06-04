import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Wishlist",
  description: "Your saved college preferences for JEE counselling.",
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
