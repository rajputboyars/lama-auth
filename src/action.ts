"use server";
import { getIronSession } from "iron-session";
import { defaultSession, SessionData, sessionOptions } from "./lib";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

let username = "abhishek";
let isPro = false;
let isBlocked = false;

export const getSession = async () => {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    session.isLoggedIn = defaultSession.isLoggedIn;
  }

  //   chech the user in db
  session.isBlocked = isBlocked;
  session.isPro = isPro;
  return session;
};

export const login = async (
  prevState: { error: undefine | string },
  formData: FormData
) => {
  const session = await getSession();
  // console.log(formData,"formdata");
  console.log(formData, "formdata");

  const formUsername = formData.get("username") as string;
  const formPassword = formData.get("password") as string;
  console.log(formUsername, "formusername");

  // check user in db
  // const user = await db.getuser({username,password})

  if (formUsername !== username) {
    return {
      error: "wrong credentials !",
    };
  }
  session.userId = "1";
  session.username = formUsername;
  session.isPro = isPro;
  session.isLoggedIn = true;

  await session.save();
  redirect("/");
};

export const logout = async () => {
  const session = await getSession();
  session.destroy();
  redirect("/");
};

export const changePremium = async () => {
  const session = await getSession();
  isPro = !session.isPro;
  session.isPro = isPro;
  await session.save();
  revalidatePath("/profile");
};

export const changeUsername = async (formData: FormData) => {
  const session = await getSession();

  const newUsername = formData.get("username") as string;
  username = newUsername;
  session.username = username;
  await session.save();
  revalidatePath("/pofile");
};
