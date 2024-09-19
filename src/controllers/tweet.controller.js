import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content}=req.body;
    if(!content.trim())
    {
        throw new ApiError(400,"content is required")
    }
    const tweet=await Tweet.create(
        {
            owner:req.user?._id,
            content:content
        }
    )
    return res.status(200).json(new ApiResponse(200,tweet,"Tweet created successfully!!!"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId}=req.params;
    const allTweets=await Tweet.aggregate(
        [
            {
                $match:{
                    owner:new mongoose.Types.ObjectId(userId)
                }
            }
        ]
    )
    return res.status(200).json(new ApiResponse(200,allTweets,"All tweets fetched successfully!!"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId}=req.params
    const {content}=req.body;
    const updatedTweet=await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content:content
            }
        },
        {
            new:true
        }
    )
    return res.status(200).json(new ApiResponse(200,updatedTweet,"Tweet updated successfully!!"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId}=req.params;
    if(!tweetId)
    {
        throw new ApiError(400,"Tweet Id is missing!!!")
    }
    const deletedTweet=await Tweet.findByIdAndDelete(
        tweetId
    )
    if(!deleteTweet)
    {
        throw new ApiError(404,"Invalid TweetId")
    }
    return res.status(200).json(new ApiResponse(200,{},"Tweet deleted successfully!!"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
