
import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const {name, description} = req.body
    if (!name && !description) {
        throw new ApiError(400, "enter name and description first")
    }

    const createPlaylist = await Playlist.create({
        name: name,
        description: description,
        owner: new mongoose.Types.ObjectId(req.user._id)
    })

    if (!createPlaylist) {
        throw new ApiError(400, "playlist is not created")
    }

    return res.status(200).json(new ApiResponse(200, createPlaylist, "playlist is created sucessfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const {userId} = req.params
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "user not found")
    }

    const getPlaylist = await Playlist.find({
        owner : userId
    })

    if (!getPlaylist) {
        throw new ApiError(400, "there is no playlist")
    }

    return res.status(200).json(new ApiResponse(200, getPlaylist, "playlist fetched sucessfully"))
   
})

const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "id is not correct")
    }

    const playlistById = await Playlist.findById(playlistId)

    if (!playlistById) {
        throw new ApiError(400, "no playlist")
    }

    return res.status(200).json(new ApiResponse(200, playlistById, "playlist is created"))
   
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!isValidObjectId(playlistId) && !isValidObjectId(videoId)) {
        throw new ApiError(400, "playlist and video id's is required")
    }

    const findPlaylist = await Playlist.findById(playlistId)
    if (!findPlaylist) {
        throw new ApiError(400, "playlist not found")
    }
    // console.log(findPlaylist)
    if (!findPlaylist.owner.equals(req.user._id)) {
        throw new ApiError(400, "unauthorized request")
    }

    if (findPlaylist.videos.includes(videoId)) {
        throw new ApiError(400, "video is already exsisted")
    }

    findPlaylist.videos.push(videoId)
    const addVideo = await findPlaylist.save()

    if (!addVideo) {
        throw new ApiError(400, "video not added")
    }

    return res.status(200).json(new ApiResponse(200, addVideo, "video added sucessfully"))

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId) && !isValidObjectId(videoId)) {
        throw new ApiError(400, "playlist and video id's is required")
    }

   const findVideo = await Playlist.findOne({
    $and:[{
        _id: playlistId
    }, {
        videos: videoId
    }]
   })

   if (!findVideo) {
    throw new ApiError(400, "video not found")
   }

    if (!findVideo.owner.equals(req.user._id)) {
        throw new ApiError(400, "unauthorized request")
    }

    findVideo.videos.pull(videoId)
    const removeVideo = await findVideo.save()

    if (!removeVideo) {
        throw new ApiError(400, "video is not removed")
    }
    return res.status(200).json(new ApiResponse(200, removeVideo, "video is removed sucessfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const {playlistId} = req.params
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(200, "id is incorrect")
    }

    const findPlaylist = await Playlist.findById(playlistId)
    if (!findPlaylist) {
        throw new ApiError(400, "playlist is not found")
    }

    if (!findPlaylist.owner.equals(req.user._id)) {
        throw new ApiError(400,"unauthorized reqst")
    }

    const deletePlaylist = await Playlist.findByIdAndDelete(playlistId)

    if (!deletePlaylist) {
        throw new ApiError(400, "playlist is not deleted")
    }

    return res.status(200).json(new ApiResponse(200, deletePlaylist, "playlist deleted sucessfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    //TODO: update playlist
    const {playlistId} = req.params
    const {name, description} = req.body

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "id is incorrect")
    }
    if (!name && !description) {
        throw new ApiError(400, "both are required")
    }

    const findPlaylist = await Playlist.findById(playlistId)
    if (!findPlaylist) {
        throw new ApiError(400, " playlist is not found")
    }

    if (!findPlaylist.owner.equals(req.user._id)) {
        throw new ApiError(400, "unauthorized request")
    }

    findPlaylist.name = name
    findPlaylist.description = description

    const updatePlaylist = await findPlaylist.save()
    if (!updatePlaylist) {
        throw new ApiError(400, "playlist is not updated")
    }

    return res.status(200).json(new ApiResponse(200, updatePlaylist, "playlist is updated sucessfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
