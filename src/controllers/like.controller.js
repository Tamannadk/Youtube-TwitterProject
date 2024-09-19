import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  const likedVideo = await Like.aggregate([
    {
      $match: {
        $and: [
          {
            video: new mongoose.Types.ObjectId(videoId),
          },
          {
            likedBy: new mongoose.Types.ObjectId(req.user?._id),
          },
        ],
      },
    },
  ]);
  if (likedVideo?.length == 0) {
    await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });
    res
      .status(200)
      .json(new ApiResponse(200, { isLiked: true }, "successfully liked the video!!"));
  } else {
    await Like.findByIdAndDelete(likedVideo[0]._id);
    res
      .status(200)
      .json(new ApiResponse(200, { isLiked: false }, "successfully unliked the video"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
    if(!commentId)
    {
        throw new ApiError(400,"comment id is required")
    }
    const likedComment=await Like.aggregate(
        [
            {
                $match:{
                    $and:[
                        {
                            comment:new mongoose.Types.ObjectId(commentId)
                        },
                        {
                            likedBy:new mongoose.Types.ObjectId(req.user?._id)
                        }
                    ]
                }
            }
        ]
    )
    if(!likedComment?.length==0)
    {
        await Like.create(
            {
                comment:commentId,
                likedBy:req.user?._id
            }
        )
        return res.status(200).json(new ApiResponse(200,{isLiked:true},"successfully liked the comment!!!"))
    }else{
        await Like.findByIdAndDelete(
            likedComment[0]._id
        )
        res.status(200).json(new ApiResponse(200,{isLiked:false},"successfully unliked the comment!!!"))
    }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  const likedTweet=await Like.aggregate(
    [
        {
            $match:{
                $and:[
                    {
                        tweet:new mongoose.Types.ObjectId(tweetId)
                    },
                    {
                        likedBy:new mongoose.Types.ObjectId(req.user?._id)
                    }
                ]
            }
        }
    ]
  )
  if(likedTweet?.length==0)
  {
    await Like.create(
        {
            tweet:tweetId,
            likedBy:req.user?._id
        }
    )
    return res.status(200).json(new ApiResponse(200,{isLiked:true},"Successfully liked tweet!!!"))
  }
  else{
    await Like.findByIdAndDelete(likedTweet[0]?._id)
    return res.status(200).json(new ApiResponse(200,{isLiked:true},"Successfully unliked tweet!!!"))
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const allLikedVideo=await Like.aggregate(
    [
        {
            $match:{
                likedBy:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideo",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]
  )

  res.status(200).json(new ApiResponse(200, allLikedVideo, "get liked video"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
