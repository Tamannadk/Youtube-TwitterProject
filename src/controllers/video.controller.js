import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = 1,
    userId,
  } = req.query;

  // Build the aggregation pipeline
  const videoAggregate = [
    {
      $match: {
        $or: [
          { title: { $regex: query || "", $options: "i" } },
          { description: { $regex: query || "", $options: "i" } },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
      },
    },
    {
      $sort: {
        [sortBy]: parseInt(sortType),
      },
    },
  ];

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    customLabels: {
      totalDocs: "totalVideos",
      docs: "videos",
    },
  };

  try {
    const result = await Video.aggregatePaginate(
      Video.aggregate(videoAggregate),
      options
    );

    if (result?.videos?.length === 0 && userId) {
      return res.status(200).json(new ApiResponse(200, [], "No videos found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Videos fetched successfully"));
  } catch (error) {
    console.error("Error during video aggregation or pagination:", error);
    throw new ApiError(
      500,
      error.message || "Internal server error in video aggregation"
    );
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  const videoFile = req.files?.videoFile[0]?.path;
  const thumbnail = req.files?.thumbnail[0]?.path;
  if (!title || !description) {
    throw new ApiResponse(401, "Some fields are missing!!");
  }
  if (!videoFile || !thumbnail) {
    throw new ApiError(401, "media files missing");
  }
  //uploading thumbnail to cloudinary
  const updatedThumbnail = await uploadOnCloudinary(thumbnail);
  //uploading video file to cloudinary
  const updatedVideoFile = await uploadOnCloudinary(videoFile);

  const publishedVideo = await Video.create({
    title,
    description,
    videoFile: updatedVideoFile?.secure_url,
    thumbnail: updatedThumbnail?.secure_url,
    duration: updatedVideoFile.duration,
    owner: req.user?._id,
  });
  if (!publishedVideo) {
    throw new ApiError(404, "Error while publishing video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, publishedVideo, "Video Published Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
  ]);
  if (!video) {
    throw new ApiError(400, "Video not available");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully!!"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  const { title, description, thumbnail } = req.body;
  if (!title || !description || !thumbnail) {
    throw new ApiError(400, "title/description/thumbnail are required!!");
  }
  let videoLocalFilePath;
  let thumbnailLocalFilePath;
  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoLocalFilePath = req.files.videoFile[0].path;
  }

  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalFilePath = req.files.thumbnail[0].path;
  }
  const video = await Video.findById(videoId);

  if (!video || !video?.owner?.equals(req.user?._id)) {
    throw new ApiError(400, "Unauthorized user");
  }
  let updatedVideo = video.videoFile; // Existing video URL or placeholder
  let updatedThumbnail = video.thumbnail; // Existing thumbnail URL or placeholder

  if (videoLocalFilePath) {
    updatedVideo = await uploadOnCloudinary(videoLocalFilePath);
    video.duration = updatedVideo.duration; // Ensure the video object is updated with duration
  }

  if (thumbnailLocalFilePath) {
    updatedThumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);
  }

  await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title,
        description: description,
        videoFile: updatedVideo?.url || video?.videoFile,
        thumbnail: updatedThumbnail?.url || video?.thumbnail,
      },
    },
    {
      new: true,
    }
  );
  const updatedVideoDetails = await Video.findById(videoId);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideoDetails,
        "Video details updated successfully"
      )
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!videoId) {
    throw new ApiError(400, "Video id is missing");
  }
  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo) {
    throw new ApiError(400, "Invalid video id");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully!!!"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(
      400,
      !videoId ? "VideoId is missing" : "Invalid object id"
    );
  }

  const video = await Video.findById(videoId);

  const toggle = !video.isPublished;
  video.isPublished = toggle;

  const toggledVideo = await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        toggledVideo,
        "video publish status toggled successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
