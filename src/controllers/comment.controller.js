import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    const options={
        page,
        limit
    }
    const allComments=await Comment.aggregate(
        [
            {
                $match:{
                    video:new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup:{
                    from:"users",
                    localField:"owner",
                    foreignField:"_id",
                    as:"owner",
                    pipeline:[
                        {
                            $project:{
                                _id:1,
                                fullName:1,
                                avatar:1,
                                username:1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    owner: {
                        $first: "$owner"
                    }
                }
            }
        ]
    )
    await Comment.aggregatePaginate(allComments,options)
    .then((results)=>{
        return res.status(200).json(new ApiResponse(200,results,"Video Comments fetched successfully"));
    })
    .catch((error)=>{
        throw new ApiError(500,`OOPS! ${error?.message}`);
    })

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {content}=req.body;
    const {videoId}=req.params;
    if(!content?.trim() || videoId)
    {
        throw new ApiError(400,"Some fields are missing");
    }
    const comment=await Comment.create(
        {
            content:content,
            video:videoId,
            owner:req.user?._id
        }
    )
    console.log(comment)
    return res.status(200).json(new ApiResponse(200,comment,"Comment created successfully"));
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId}=req.params
    const {content}=req.body;
    if(!content.trim())
    {
        throw new ApiError(400,"Content is required!!!")
    }
    const comment=await Comment.findByIdAndUpdate(
        commentId,
        {
            $set:{
                content:content
            }
        },
        {
            new:true

        }
    )
    return res
    .status(200)
    .json(new ApiResponse(200,comment,"Comment updated successfully!!!"))

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId}=req.params;
    if(!commentId)
    {
        throw new ApiError(400,"comment id is missing!!")
    }
    const deletedComment=await Comment.findByIdAndDelete(
        commentId
    )
    if(!deleteComment)
    {
        throw new ApiError(400,"Invalid comment Id")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,{},"Comment deleted successfully!!!"))
    
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
