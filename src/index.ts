import { config as configure } from 'dotenv'
configure()

import { initInsta } from './insta'
import { UserRepositoryInfoResponseUser } from 'instagram-private-api'
import * as db from "./database"

function timeout(length: number): Promise<void> {
    return new Promise((res, rej) => {
        setTimeout(res, length * 1000)
    })
}

async function main() {
    const insta = await initInsta()
    let entry
    try {
        entry = await db.entry()
    } catch (e) {
        entry = await insta.user.getIdByUsername(process.env.INSTA_ENTRY || 'nicht_eli')
    }

    let isStart = true

    while (true) {
        let user: UserRepositoryInfoResponseUser
        try {
            user = await insta.user.info(await db.entry())
        } catch (e) {
            user = await insta.user.usernameinfo(process.env.INSTA_ENTRY || 'nicht_eli')
        }

        db.user(user.pk, user.username, user.full_name, user.is_private, user.follower_count, user.following_count)

        if (isStart) {
            console.log('Starting at', user.username)
            isStart = false
        }
        await timeout(7)
        if (user.follower_count <= 1000 && !user.is_private) {
            const followingFeed = insta.feed.accountFollowing(user.pk)
            do {
                const items = await followingFeed.items()
                const batch = db.session()
                items.forEach(item => {
                    batch.user(item.pk, item.username, item.full_name, item.is_private)
                    batch.addFollowing(item.pk, user.pk)
                })
                batch.execute()
                await timeout(7)
            } while (followingFeed.isMoreAvailable())
            db.fetched(user.pk)
            console.log('User finished: ', user.username)
        } else {
            db.fetched(user.pk)
            console.log('User skipped: ', user.username)
        }
    }
}
const shutdown = async () => {
    await db.driver.close()
    process.exit()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

main()




