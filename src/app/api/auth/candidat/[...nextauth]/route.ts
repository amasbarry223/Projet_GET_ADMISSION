import NextAuth from "next-auth";
import { authOptionsCandidat } from "@/lib/auth";

const handler = NextAuth(authOptionsCandidat);

export { handler as GET, handler as POST };
