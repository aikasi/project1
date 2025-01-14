import { NextFunction, Request, Response } from "express";
import { getMongoRepository, getRepository } from "typeorm";
import routes from "../../routes";
import { Tweet } from "../entity/mongoDB/Tweet";
import { User, UserInfo } from "../entity/mySql/User";
import { localMiddleware } from "../middleware";
const ObjectId = require("mongodb").ObjectId;

export const getPostHome = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // const [exUser]: User<UserInfo>[] = await getRepository(User).find({
  //   where: { id: req.user.id },
  //   relations: ["posts"],
  // });
  // res.render("posts", { users: exUser });
};

export const getTweetDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    params: { id: tweetId },
  } = req;
  console.log(tweetId);
  const tweetsRepository = getMongoRepository(Tweet);
  const tweet = await tweetsRepository.findOne(tweetId);
  const lowerTweetsDB = tweet.lowerTweets;
  const lowerTweets = [];
  for (const value of lowerTweetsDB) {
    const tweetsDB = await tweetsRepository.findOne(value);
    lowerTweets.push(tweetsDB);
  }
  console.log(lowerTweets);
  return res.render("tweetDetail", { tweet, lowerTweets });
};

export const postDeleteTweet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {};

export const getDeleteTweet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      params: { id },
    } = req;
    const tweetsRepository = getMongoRepository(Tweet);
    // lowerTweet
    const tweetDB = await tweetsRepository.findOne(id);

    const replyTweet = tweetDB.reply;
    const tweetUser = tweetDB.id.toString();
    if (tweetDB.reply) {
      console.log("REPLY TWEET : " + replyTweet);
      const tweet = await tweetsRepository.findOne(replyTweet);
      const tweetLowerList = tweet.lowerTweets.filter(
        (target) => target !== replyTweet
      );
      await tweetsRepository.findOneAndUpdate(
        { _id: ObjectId(replyTweet) },

        {
          $inc: { lowerTweetNumber: -1 },
          $set: { lowerTweets: tweetLowerList },
        },
        { upsert: true }
      );
    }
    // User Tweet
    const userRepository = getMongoRepository(User);
    const userDB = await userRepository.findOne(
      ObjectId(res.locals.loggedInUser.id)
    );
    // [Object Object] 오류로 인해 우회로 방법을 씀.
    const userTweetList = userDB.tweets.filter(
      (target) => target !== tweetUser
    );
    console.log(userTweetList);
    const userTweetList1 = userTweetList.filter(
      (target) => target === tweetUser
    );
    console.log(userTweetList1);
    await userRepository.findOneAndUpdate(
      { _id: ObjectId(res.locals.loggedInUser.id) },
      { $inc: { tweetCount: -1 }, $set: { tweets: userTweetList1 } },
      { upsert: true }
    );
    // User Like
    const isUserLike = userDB.likes.filter((target) => target === id);
    if (isUserLike.length !== 0) {
      const UserLikeList = userDB.likes.filter((target) => target !== id);
      await userRepository.findOneAndUpdate(
        { _id: ObjectId(res.locals.loggedInUser.id) },
        { $inc: { likeCount: -1 }, $set: { likes: UserLikeList } },
        { upsert: true }
      );
    }
    await tweetsRepository.findOneAndDelete({ _id: ObjectId(id) });

    return res.redirect(routes.home);
  } catch (error) {
    console.error("ERROR : " + error);
  }

  return res.render("deleteTweet");
};
