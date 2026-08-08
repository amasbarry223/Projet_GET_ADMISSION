import NextAuth from "next-auth";
import { authOptionsStaff } from "@/lib/auth";

const handler = NextAuth(authOptionsStaff);

export { handler as GET, handler as POST };
