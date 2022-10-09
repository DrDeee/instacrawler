import * as neo4j from 'neo4j-driver'

export const driver = neo4j.driver(
    process.env.NEO4J_URI as string,
    neo4j.auth.basic(process.env.NEO4J_USER as string, process.env.NEO4J_PASSWORD as string)
)

export function transaction() {
    return driver.session().beginTransaction()
}

export function session() {
    const queries: [string, { [key: string]: any }][] = []

    return {
        addFollowing(id: number, following: number) {
            queries.push(['MATCH (u:User {id: $id}), (f:User {id: $following}) MERGE (f)-[:FOLLOWS]->(u)', { id, following }])
        },
        user(id: number, name: string, displayName: string, privateAcc: boolean, follower: number = 0, following: number = 0) {
            queries.push([
                'MERGE (u:User {id: $id}) ON CREATE SET u._fetched = false , u.name = $name, u.displayName = $displayName, u._created = timestamp(), u.private = $privateAcc, u.follower = $follower, u.following = $following ON MATCH SET u.follower = $follower, u.following = $following',
                {
                    id,
                    name,
                    displayName,
                    privateAcc,
                    follower,
                    following
                }
            ])

        },
        async execute() {
            const session = driver.session()
            const transaction = session.beginTransaction()
            for (const statement of queries) {
                transaction.run(statement[0], statement[1])
            }
            await transaction.commit()
            await session.close()
        }
    }
}

export async function entry(): Promise<number> {
    const session = driver.session()
    const result = await session.run('MATCH (u:User) WHERE u._fetched = false RETURN u.id ORDER BY u._created LIMIT 1 ')
    await session.close()
    if (result.records.length > 0)
        return result.records[0].get('u.id') as number
    throw new Error('No entry found')
}

export async function user(id: number, name: string, displayName: string, privateAcc: boolean, follower: number = 0, following: number = 0) {
    const batch = session()
    batch.user(id, name, displayName, privateAcc, follower, following)
    await batch.execute()
}

export async function fetched(id: number) {
    const session = driver.session()
    await session.run(
        'MATCH (u:User {id: $id}) SET u._fetched = true',
        { id }
    )
    await session.close()
}